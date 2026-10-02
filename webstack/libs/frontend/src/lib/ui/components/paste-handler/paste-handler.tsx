/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import { useToast, useDisclosure, Popover, Portal, PopoverContent, PopoverHeader, PopoverBody, Button, Center } from '@chakra-ui/react';

import { initialValues } from '@sage3/applications/initialValues';
import { stringContainsCode } from '@sage3/shared';
import {
  isValidURL,
  setupApp,
  processContentURL,
  useFiles,
  useUser,
  useAuth,
  useAppStore,
  useCursorBoardPosition,
  useUIStore,
  isElectron,
  viewCenter,
  placeNewApps,
  useUserSettings,
  useConfigStore,
  withUserProvider,
  seerAgents,
  dataURLtoBlob,
} from '@sage3/frontend';
import { AppSchema } from '@sage3/applications/schema';
import { LLMConfigManager } from '@sage3/shared/types';

// Captured windows in a series: the next one goes right of the previous, unless it comes
// this long after it, which starts a new row below
const CAPTURE_ROW_GAP = 5 * 60 * 1000;
// Space between captures, in board pixels
const CAPTURE_SPACING = 40;
// Captures are shown this much larger than a pasted image (readable slide text)
const CAPTURE_SCALE = 1.4;
// A slide's caption (its number and title): a note above the capture, as wide as it
const CAPTION_HEIGHT = 120;
const CAPTION_GAP = 10;

// The current series of captured windows on a board: its row, and the last capture
type CaptureSeries = {
  boardId: string;
  rowX: number;
  rowY: number;
  rowHeight: number;
  last: { x: number; y: number; width: number; height: number; at: number };
};

// Development or production
const development: boolean = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

/**
 * Handling copy/paste events on a board
 */

type PasteProps = {
  boardId: string;
  roomId: string;
};

/**
 * PasteHandler component
 * @param {any} props
 * @returns JSX.Element
 */
export const PasteHandler = (props: PasteProps): JSX.Element => {
  // show some notifications
  const toast = useToast();
  // User information
  const { user } = useUser();
  const { auth } = useAuth();
  const { getBoardCursor, getCursor } = useCursorBoardPosition();
  // App Store
  const createApp = useAppStore((state) => state.create);
  // UI Store
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const boardSynced = useUIStore((state) => state.boardSynced);
  const [validURL, setValidURL] = useState('');
  // Popover
  const { isOpen: popIsOpen, onOpen: popOnOpen, onClose: popOnClose } = useDisclosure();
  const [dropCursor, setDropCursor] = useState({ x: 0, y: 0 });
  // hooks
  const { uploadFiles, uploadInProgress } = useFiles();
  // The latest upload function, for the Electron listener below (registered once per board)
  const uploadRef = useRef(uploadFiles);
  uploadRef.current = uploadFiles;
  const seriesRef = useRef<CaptureSeries | null>(null);
  // The user's AI model, and whether it can see images (as the Chat app checks)
  const { settings } = useUserSettings();
  const serverConfig = useConfigStore((state) => state.config);
  const canSeeImages = (): boolean => {
    if (!serverConfig?.models || !settings.aiModel) return false;
    return new LLMConfigManager(withUserProvider(serverConfig.models)).canProviderPerformTask(settings.aiModel, 'image');
  };
  const canSeeRef = useRef(canSeeImages);
  canSeeRef.current = canSeeImages;
  const modelRef = useRef(settings.aiModel);
  modelRef.current = settings.aiModel;

  // Place a captured window: the first of a series in the free spot closest to the view's
  // center; the next ones in a row to its right, and in a new row below after a long pause.
  // Moving or deleting the last capture starts a new series. With a caption, a note with it
  // goes just above the capture, in the same slot of the grid.
  const arrangeCapture = (apps: AppSchema[], caption?: string): AppSchema[] => {
    const [pasted] = apps;
    if (!pasted) return apps;
    // Larger, keeping its shape (whole pixels, as it is compared below)
    const size = {
      ...pasted.size,
      width: Math.round(pasted.size.width * CAPTURE_SCALE),
      height: Math.round(pasted.size.height * CAPTURE_SCALE),
    };
    const app = { ...pasted, size };
    const now = Date.now();
    const series = seriesRef.current;
    const last = series?.last;
    const lastStillThere =
      series?.boardId === props.boardId &&
      useAppStore
        .getState()
        .apps.some(
          (a) =>
            a.data.position.x === last?.x && a.data.position.y === last?.y && a.data.size.width === last?.width && a.data.size.height === last?.height
        );
    const { width, height } = app.size;
    // The slot in the grid: the caption's note above the capture, when there is one
    const above = caption ? CAPTION_HEIGHT + CAPTION_GAP : 0;
    const slotHeight = height + above;
    // Whole pixels, as the app is created, so the next capture finds this one again
    const at = (p: { x: number; y: number }) => ({ x: Math.round(p.x), y: Math.round(p.y) });
    // Where the slot goes (its top left corner)
    let slot: { x: number; y: number };
    if (!series || !last || !lastStillThere) {
      slot = at(placeNewApps([{ ...app, size: { ...app.size, height: slotHeight } }])[0].position);
      seriesRef.current = { boardId: props.boardId, rowX: slot.x, rowY: slot.y, rowHeight: slotHeight, last: { x: 0, y: 0, width, height, at: now } };
    } else if (now - last.at < CAPTURE_ROW_GAP) {
      slot = at({ x: last.x + last.width + CAPTURE_SPACING, y: series.rowY });
      series.rowHeight = Math.max(series.rowHeight, slotHeight);
    } else {
      slot = at({ x: series.rowX, y: series.rowY + series.rowHeight + CAPTURE_SPACING });
      seriesRef.current = { ...series, rowY: slot.y, rowHeight: slotHeight };
    }
    // The capture at the bottom of its slot, remembered to find it again
    const position = { x: slot.x, y: slot.y + above };
    if (seriesRef.current) seriesRef.current.last = { ...position, width, height, at: now };
    const placed: AppSchema[] = [{ ...app, position: { ...app.position, ...position } }];
    if (caption) {
      placed.push({
        ...app,
        title: user?.data.name ?? '',
        type: 'Stickie',
        position: { ...app.position, ...slot },
        size: { width, height: CAPTION_HEIGHT, depth: 0 },
        state: { ...initialValues['Stickie'], text: caption, fontSize: 24, color: user?.data.color || 'yellow' },
      } as AppSchema);
    }
    return placed;
  };
  const arrangeRef = useRef(arrangeCapture);
  arrangeRef.current = arrangeCapture;

  // Electron: the tray menu's "Capture Zoom Window" sends the captured window. When the
  // user's AI model can see images, seer crops it to the presentation slide in it; then it's
  // uploaded like a pasted image and placed by arrangeCapture
  useEffect(() => {
    if (!isElectron()) return;
    window.electron.on('captured-window', async (capture: { name: string; data: Uint8Array<ArrayBuffer> }) => {
      if (auth?.provider === 'guest') {
        toast({ title: 'Guests cannot upload assets', status: 'warning', duration: 4000, isClosable: true });
        return;
      }
      const now = new Date();
      const stamp = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
      let image: Blob = new Blob([capture.data], { type: 'image/png' });
      let name = capture.name;
      let caption: string | undefined;
      if (canSeeRef.current()) {
        const slide = await findSlide(image, modelRef.current);
        if (slide) {
          image = slide.image;
          name = 'Slide';
          // A note with the slide's number and title, or whichever of them was read
          if (slide.number && slide.title) caption = `Slide ${slide.number}: ${slide.title}`;
          else if (slide.title) caption = slide.title;
          else if (slide.number) caption = `Slide ${slide.number}`;
        }
      }
      const file = new File([image], `${name} ${stamp}.png`, { type: 'image/png' });
      const center = viewCenter();
      uploadRef.current([file], center.x, center.y, props.roomId, props.boardId, (apps) => arrangeRef.current(apps, caption));
    });
    return () => window.electron.removeAllListeners('captured-window');
  }, [props.roomId, props.boardId, auth?.provider]);

  // The presentation slide in a screenshot, cropped by seer, with its number and title when
  // read; or null (none found, or an error: the whole screenshot is used then)
  const findSlide = async (image: Blob, model: string): Promise<{ image: Blob; number?: number; title?: string } | null> => {
    const dataURL = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(image);
    });
    const answer = await seerAgents.slide({ user: user?.data.name ?? '', model, image: dataURL });
    if (!('found' in answer)) {
      toast({ title: 'Could not look for a slide', description: answer.message, status: 'warning', duration: 4000, isClosable: true });
      return null;
    }
    if (!answer.found || !answer.image) {
      toast({ title: 'No slide found', description: 'The whole window was added.', status: 'info', duration: 3000, isClosable: true });
      return null;
    }
    return {
      image: dataURLtoBlob(answer.image),
      number: answer.slideNumber ?? undefined,
      title: answer.slideTitle ?? undefined,
    };
  };

  useEffect(() => {
    if (!user) return;

    const pasteHandlerBoard = (event: ClipboardEvent) => {
      // Paste inhibitor to prevent pasting while in drag mode, to prevent positioning errors.
      // To have an optimized drag/pan, we implemented a local positioning state in the Background Layer.
      // After a few ms, the local positioning state will sync with the global (zustand useUIStore); in which we will allow pasting after the sync.
      if (!boardSynced) {
        toast({
          title: 'Pasting while panning or zooming is not supported',
          status: 'warning',
          duration: 2000,
          isClosable: true,
        });
        return;
      }

      // get the target element and make sure it is the background board
      const elt = event.target as HTMLElement;
      if (elt.tagName === 'INPUT' || elt.tagName === 'TEXTAREA') return;

      // Not on a selected app
      if (selectedApp) return;

      // Block guests from uploading assets
      if (auth?.provider === 'guest') {
        toast({
          title: 'Guests cannot upload assets',
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
        return;
      }

      // Get the user cursor position
      const cursorPosition = getBoardCursor();
      const xDrop = cursorPosition.x;
      const yDrop = cursorPosition.y;
      const mousePosition = getCursor();
      setDropCursor({ x: mousePosition.x, y: mousePosition.y });

      // Get content of clipboard
      const pastedText = event.clipboardData?.getData('Text');

      // Upload files from clipboard
      if (event.clipboardData?.files) {
        if (event.clipboardData.files.length > 0) {
          try {
            if (!uploadInProgress) {
              toast.closeAll();

              uploadFiles(Array.from(event.clipboardData.files), xDrop, yDrop, props.roomId, props.boardId);
            } else {
              toast({
                title: 'Upload in progress - Please wait',
                status: 'warning',
                duration: 4000,
                isClosable: true,
              });
            }
          } catch (error) {
            console.log('Error> uploading files', error);
          }
        } else if (pastedText) {
          // check and validate the URL
          const isValid = isValidURL(pastedText.trim());
          const iscustomURL = pastedText.startsWith('sage3://');
          const isdevboard = development && pastedText.startsWith('http://') && pastedText.includes('/#/enter/');
          const isprodboard = pastedText.startsWith('https://') && pastedText.includes('/#/enter/');
          // If the pasted text is a SAGE3 URL, create a BoardLink app
          if (iscustomURL || isdevboard || isprodboard) {
            // Create a board link app
            createApp({
              title: 'BoardLink',
              roomId: props.roomId,
              boardId: props.boardId,
              position: { x: xDrop, y: yDrop, z: 0 },
              size: { width: 400, height: 375, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'BoardLink',
              state: { ...initialValues['BoardLink'], url: pastedText.trim() },
              raised: true,
              dragging: false,
              pinned: false,
            });
          } else if (isValid) {
            setValidURL(isValid);
            popOnOpen();
          } else {
            // Create a new stickie
            const lang = stringContainsCode(pastedText);
            if (lang === 'plaintext') {
              createApp({
                title: user.data.name,
                roomId: props.roomId,
                boardId: props.boardId,
                position: { x: xDrop, y: yDrop, z: 0 },
                size: { width: 400, height: 400, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'Stickie',
                state: { ...initialValues['Stickie'], text: pastedText, fontSize: 24, color: user.data.color || 'yellow' },
                raised: true,
                dragging: false,
                pinned: false,
              });
            } else {
              createApp({
                title: user.data.name,
                roomId: props.roomId,
                boardId: props.boardId,
                position: { x: xDrop, y: yDrop, z: 0 },
                size: { width: 850, height: 400, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'CodeEditor',
                state: { ...initialValues['CodeEditor'], content: pastedText, language: lang, filename: 'pasted-code' },
                raised: true,
                dragging: false,
                pinned: false,
              });
            }
          }
        }
      }
    };

    // Add the handler to the whole page
    document.addEventListener('paste', pasteHandlerBoard);

    return () => {
      // Remove function during cleanup to prevent multiple additions
      document.removeEventListener('paste', pasteHandlerBoard);
    };
  }, [props.boardId, props.roomId, user, selectedApp, boardSynced]);

  const createWeblink = () => {
    const cursorPosition = getBoardCursor();
    createApp(
      setupApp(
        'WebpageLink',
        'WebpageLink',
        cursorPosition.x,
        cursorPosition.y,
        props.roomId,
        props.boardId,
        { w: 400, h: 400 },
        { url: validURL }
      )
    );
    popOnClose();
  };
  const createWebview = () => {
    const cursorPosition = getBoardCursor();
    const final_url = processContentURL(validURL);
    let w = 800;
    let h = 800;
    if (final_url !== validURL) {
      // might be a video
      w = 1280;
      h = 720;
    }
    createApp(
      setupApp(
        'Webview',
        'Webview',
        cursorPosition.x,
        cursorPosition.y,
        props.roomId,
        props.boardId,
        { w: w, h: h },
        { webviewurl: final_url }
      )
    );
    popOnClose();
  };

  return (
    <Popover isOpen={popIsOpen} onOpen={popOnOpen} onClose={popOnClose}>
      <Portal>
        <PopoverContent w={'250px'} style={{ position: 'absolute', left: dropCursor.x - 125 + 'px', top: dropCursor.y - 45 + 'px' }}>
          <PopoverHeader fontSize={'sm'} fontWeight={'bold'}>
            <Center>Create a Link or open URL</Center>
          </PopoverHeader>
          <PopoverBody>
            <Center>
              <Button colorScheme="green" size="sm" mr={2} onClick={createWeblink}>
                Create Link
              </Button>
              <Button colorScheme="green" size="sm" mr={2} onClick={createWebview}>
                Open URL
              </Button>
            </Center>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
};

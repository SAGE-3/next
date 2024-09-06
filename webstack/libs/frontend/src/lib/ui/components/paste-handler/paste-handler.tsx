/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useToast, useDisclosure, Popover, Portal, PopoverContent, PopoverHeader, PopoverBody, Button, Center } from '@chakra-ui/react';

import { initialValues } from '@sage3/applications/initialValues';
import { stringContainsCode } from '@sage3/shared';
import { isValidURL, setupApp, processContentURL, useFiles } from '@sage3/frontend';
import { useUser, useAuth, useAppStore, useCursorBoardPosition, useUIStore } from '@sage3/frontend';

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
  const { boardCursor: cursorPosition, cursor: mousePosition } = useCursorBoardPosition();
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
        })
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
      const xDrop = cursorPosition.x;
      const yDrop = cursorPosition.y;
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
          // If the start of pasted text is http, can assume is a url
          if (isValid) {
            setValidURL(isValid);
            popOnOpen();
          } else if (pastedText.startsWith('sage3://')) {
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
                state: { ...initialValues['Stickie'], text: pastedText, fontSize: 36, color: user.data.color || 'yellow' },
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
  }, [cursorPosition.x, cursorPosition.y, props.boardId, props.roomId, user, selectedApp]);

  const createWeblink = () => {
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

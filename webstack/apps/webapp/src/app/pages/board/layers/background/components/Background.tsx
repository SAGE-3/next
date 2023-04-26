/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef } from 'react';
import {
  Box, useColorModeValue, useToast, ToastId, Modal, useDisclosure,
  ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button,
} from '@chakra-ui/react';

import { isValidURL, setupApp } from '@sage3/frontend';
import {
  useUIStore,
  useAppStore,
  useUser,
  useHexColor,
  useMessageStore,
  processContentURL,
  useHotkeys,
  useCursorBoardPosition,
  useKeyPress,
  useAuth,
  useFiles,
} from '@sage3/frontend';
import { AppName, AppSchema } from '@sage3/applications/schema';
import { HelpModal } from './HelpModal';

type BackgroundProps = {
  roomId: string;
  boardId: string;
};

export function Background(props: BackgroundProps) {
  // display some notifications
  const toast = useToast();
  // Handle to a toast
  const toastIdRef = useRef<ToastId>();
  // Help modal
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();
  // Modal for opening lots of files
  const { isOpen: lotsIsOpen, onOpen: lotsOnOpen, onClose: lotsOnClose } = useDisclosure();

  // Hooks
  const { uploadFiles, openAppForFile } = useFiles();

  // Messsages
  const subMessage = useMessageStore((state) => state.subscribe);
  const unsubMessage = useMessageStore((state) => state.unsubscribe);
  const message = useMessageStore((state) => state.lastone);

  // How to create some applications
  const createApp = useAppStore((state) => state.create);
  const createBatch = useAppStore((state) => state.createBatch);

  // User
  const { user } = useUser();
  const { auth } = useAuth();
  const { position: cursorPosition, mouse: mousePosition } = useCursorBoardPosition();

  // UI Store
  const zoomInDelta = useUIStore((state) => state.zoomInDelta);
  const zoomOutDelta = useUIStore((state) => state.zoomOutDelta);
  const scale = useUIStore((state) => state.scale);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const setLassoMode = useUIStore((state) => state.setLassoMode);

  // Chakra Color Mode for grid color
  const gc = useColorModeValue('gray.100', 'gray.800');
  const gridColor = useHexColor(gc);

  // For Lasso
  const isShiftPressed = useKeyPress('Shift');

  // Perform the actual upload

  // Subscribe to messages
  useEffect(() => {
    subMessage();
    return () => {
      unsubMessage();
    };
  }, []);

  // Get the last new message
  useEffect(() => {
    if (!user) return;
    if (message && message._createdBy === user._id) {
      const title = message.data.type.charAt(0).toUpperCase() + message.data.type.slice(1);
      // Update the toast if we can
      if (toastIdRef.current) {
        toast.update(toastIdRef.current, {
          title: title,
          description: message.data.payload,
          duration: 5000,
          isClosable: true,
        });
      } else {
        // or create a new one
        toastIdRef.current = toast({
          title: title,
          description: message.data.payload,
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [message]);

  // Start dragging
  function OnDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  const newApp = (type: AppName, x: number, y: number) => {
    if (!user) return;
    if (type === 'Screenshare') {
      createApp(setupApp('', type, x, y, props.roomId, props.boardId, { w: 1280, h: 720 }));
    } else {
      createApp(setupApp('', type, x, y, props.roomId, props.boardId));
    }
  };

  // Drop event
  async function OnDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!user) return;

    // Get the position of the drop
    const xdrop = event.nativeEvent.offsetX;
    const ydrop = event.nativeEvent.offsetY;

    if (event.dataTransfer.types.includes('Files') && event.dataTransfer.files.length > 0) {
      event.preventDefault();
      event.stopPropagation();

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

      // Collect all the files dropped into an array
      collectFiles(event.dataTransfer).then((files) => {
        // do the actual upload
        uploadFiles(Array.from(files), xdrop, ydrop, props.roomId, props.boardId);
      });
    } else {
      // Drag/Drop a URL
      if (event.dataTransfer.types.includes('text/uri-list')) {
        event.preventDefault();
        event.stopPropagation();

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

        const pastedText = event.dataTransfer.getData('Url');
        if (pastedText) {
          if (pastedText.startsWith('data:image/png;base64')) {
            // it's a base64 image
            createApp(setupApp('', 'ImageViewer', xdrop, ydrop, props.roomId, props.boardId, { w: 800, h: 600 }, { assetid: pastedText }));
          } else {
            // is it a valid URL
            const valid = isValidURL(pastedText);
            if (valid) {
              // process url to be embeddable
              const final_url = processContentURL(pastedText);
              let w, h;
              if (final_url !== pastedText) {
                // it must be a video
                w = 1280;
                h = 720;
              } else {
                w = 800;
                h = 800;
              }
              createApp(setupApp('', 'Webview', xdrop, ydrop, props.roomId, props.boardId, { w, h }, { webviewurl: final_url }));
            }
          }
        }
      } else {
        // if no files were dropped, create an application
        const appName = event.dataTransfer.getData('app') as AppName;
        if (appName) {
          newApp(appName, xdrop, ydrop);
        } else {
          // Get information from the drop
          const ids = event.dataTransfer.getData('file');
          const types = event.dataTransfer.getData('type');
          if (ids && types) {
            // if it's files from the asset manager
            const fileIDs = JSON.parse(ids);
            const fileTypes = JSON.parse(types);
            // Open the file at the drop location
            const num = fileIDs.length;
            if (num < 20) {
              const batch: AppSchema[] = [];
              let xpos = xdrop;
              for (let i = 0; i < num; i++) {
                const res = await openAppForFile(fileIDs[i], fileTypes[i], xpos, ydrop, props.roomId, props.boardId);
                if (res) {
                  batch.push(res);
                  xpos += res.size.width + 10;
                }
              }
              createBatch(batch);
            } else {
              // Too many assets selected, not doing it.
              lotsOnOpen();
            }
          }
        }
      }
    }
  }

  // Question mark character for help
  useHotkeys(
    'shift+/',
    (event: KeyboardEvent): void | boolean => {
      if (!user) return;
      const x = cursorPosition.x;
      const y = cursorPosition.y;

      helpOnOpen();

      // show image or open doc
      // const doc = 'https://sage3.sagecommons.org/wp-content/uploads/2022/11/SAGE3-2022.pdf';
      // window.open(doc, '_blank');

      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    { dependencies: [cursorPosition.x, cursorPosition.y] }
  );

  // Move the board with the arrow keys
  useHotkeys(
    'up, down, left, right',
    (event: KeyboardEvent): void | boolean => {
      if (selectedAppId !== '') return;
      const shiftAmount = 50 / scale; // Grid size adjusted for scale factor
      if (event.key === 'ArrowUp') {
        setBoardPosition({ x: boardPosition.x, y: boardPosition.y + shiftAmount });
      } else if (event.key === 'ArrowDown') {
        setBoardPosition({ x: boardPosition.x, y: boardPosition.y - shiftAmount });
      } else if (event.key === 'ArrowLeft') {
        setBoardPosition({ x: boardPosition.x + shiftAmount, y: boardPosition.y });
      } else if (event.key === 'ArrowRight') {
        setBoardPosition({ x: boardPosition.x - shiftAmount, y: boardPosition.y });
      }
      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    { dependencies: [cursorPosition.x, cursorPosition.y, selectedAppId, boardPosition.x, boardPosition.y] }
  );

  // Zoom in/out of the board with the -/+ keys
  useHotkeys(
    '-, =',
    (event: KeyboardEvent): void | boolean => {
      if (selectedAppId !== '') return;
      if (event.key === '-') {
        zoomOutDelta(-10, mousePosition);
      } else if (event.key === '=') {
        zoomInDelta(10, mousePosition);
      }
      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    { dependencies: [mousePosition.x, mousePosition.y, selectedAppId] }
  );

  // Stickies Shortcut
  useHotkeys(
    'shift+s',
    (event: KeyboardEvent): void | boolean => {
      if (!user) return;
      const x = cursorPosition.x;
      const y = cursorPosition.y;
      createApp(
        setupApp(user.data.name, 'Stickie', x, y, props.roomId, props.boardId, { w: 400, h: 420 }, { color: user.data.color || 'yellow' })
      );

      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    { dependencies: [cursorPosition.x, cursorPosition.y] }
  );

  useEffect(() => {
    // if app selected, don't allow lasso, othwerwise it consumes the event away from the app
    if (selectedAppId !== '') return;
    if (isShiftPressed) {
      document.onselectstart = function () {
        return false;
      };
    }
    setLassoMode(isShiftPressed);
  }, [isShiftPressed]);

  return (
    <Box
      className="board-handle"
      width="100%"
      height="100%"
      backgroundSize={'50px 50px'}
      bgImage={`linear-gradient(to right, ${gridColor} ${1 / scale}px, transparent ${1 / scale
        }px), linear-gradient(to bottom, ${gridColor} ${1 / scale}px, transparent ${1 / scale}px);`}
      id="board"
      // Drag and drop event handlers
      onDrop={OnDrop}
      onDragOver={OnDragOver}
      onScroll={(evt) => {
        evt.stopPropagation();
      }}
      onWheel={(evt: any) => {
        evt.stopPropagation();
        const cursor = { x: evt.clientX, y: evt.clientY };
        if (evt.deltaY < 0) {
          zoomInDelta(evt.deltaY, cursor);
        } else if (evt.deltaY > 0) {
          zoomOutDelta(evt.deltaY, cursor);
        }
      }}
    >
      <Modal isCentered isOpen={helpIsOpen} onClose={helpOnClose}>
        <HelpModal onClose={helpOnClose} isOpen={helpIsOpen}></HelpModal>
      </Modal>

      {/* Too many assets selected */}
      <Modal isCentered isOpen={lotsIsOpen} onClose={lotsOnClose} size={'2xl'} blockScrollOnMount={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Opening Assets</ModalHeader>
          <ModalBody>Too many assets selected</ModalBody>
          <ModalFooter>
            <Button colorScheme="red" size="sm" mr={3} onClick={lotsOnClose}>
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
}

/**
 * Collects files into an array, from a list of files or folders
 *
 * @export
 * @param {DataTransfer} evdt
 * @returns {Promise<File[]>}
 */
export async function collectFiles(evdt: DataTransfer): Promise<File[]> {
  return new Promise<File[]>((resolve, reject) => {
    const contents: File[] = [];
    let reading = 0;

    function handleFiles(file: File) {
      reading--;
      if (file.name !== '.DS_Store') contents.push(file);
      if (reading === 0) {
        resolve(contents);
      }
    }

    const dt = evdt;
    const length = evdt.items.length;
    for (let i = 0; i < length; i++) {
      const entry = dt.items[i].webkitGetAsEntry();
      if (entry?.isFile) {
        reading++;
        // @ts-ignore
        entry.file(handleFiles);
      } else if (entry?.isDirectory) {
        reading++;
        // @ts-ignore
        const reader = entry.createReader();
        reader.readEntries(function (entries: any) {
          // @ts-ignore
          reading--;
          entries.forEach(function (dir: any, key: any) {
            reading++;
            dir.file(handleFiles);
          });
        });
      }
    }
  });
}

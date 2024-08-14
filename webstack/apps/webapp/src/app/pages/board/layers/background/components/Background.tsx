/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import { throttle } from 'throttle-debounce';
import {
  Box,
  Button,
  useColorModeValue,
  useToast,
  ToastId,
  Modal,
  useDisclosure,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  Portal,
  Center,
} from '@chakra-ui/react';

import {
  useUIStore,
  useAppStore,
  useUser,
  useHexColor,
  useMessageStore,
  useHotkeys,
  useCursorBoardPosition,
  useKeyPress,
  useAuth,
  useFiles,
  isValidURL,
  setupApp,
  useAbility,
  processContentURL,
} from '@sage3/frontend';
import { AppName, AppSchema, AppState } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';

import { HelpModal } from '@sage3/frontend';
import { Lasso } from './Lasso';

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
  // Popover
  const { isOpen: popIsOpen, onOpen: popOnOpen, onClose: popOnClose } = useDisclosure();

  // Hooks
  const { uploadFiles, openAppForFile, uploadInProgress } = useFiles();

  // Messsages
  const subMessage = useMessageStore((state) => state.subscribe);
  const unsubMessage = useMessageStore((state) => state.unsubscribe);
  const message = useMessageStore((state) => state.lastone);

  // How to create some applications
  const createApp = useAppStore((state) => state.create);
  const createBatch = useAppStore((state) => state.createBatch);

  // User
  const { user, accessId } = useUser();
  const { auth } = useAuth();
  const { cursor, boardCursor } = useCursorBoardPosition();

  // Abilities
  const canDrop = useAbility('upload', 'assets');
  // Abilities
  const canLasso = useAbility('lasso', 'apps');

  // UI Store
  const zoomInDelta = useUIStore((state) => state.zoomInDelta);
  const zoomOutDelta = useUIStore((state) => state.zoomOutDelta);
  const zoomIn = useUIStore((state) => state.zoomIn);
  const zoomOut = useUIStore((state) => state.zoomOut);
  const scale = useUIStore((state) => state.scale);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const setLassoMode = useUIStore((state) => state.setLassoMode);
  const appDragging = useUIStore((state) => state.appDragging);
  const boardDragging = useUIStore((state) => state.boardDragging);
  const inputType = useUIStore((state) => state.inputType);
  const isTouchpad = inputType === 'touch';

  // Chakra Color Mode for grid color
  const gc = useColorModeValue('gray.100', 'gray.700');
  const gridColor = useHexColor(gc);
  const [dropPosition, setDropPosition] = useState({ x: 0, y: 0 });
  const [dropCursor, setDropCursor] = useState({ x: 0, y: 0 });
  const [validURL, setValidURL] = useState('');

  // For Lasso
  const isShiftPressed = useKeyPress('Shift');
  const isCtrlPressed = useKeyPress('Control');

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
      createApp(setupApp('', type, x, y, props.roomId, props.boardId, { w: 1280, h: 720 }, { accessId }));
    } else {
      createApp(setupApp('', type, x, y, props.roomId, props.boardId));
    }
  };

  // Drop event
  async function OnDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!user) return;

    if (!canDrop) {
      toast({
        title: 'Guests and Spectators cannot upload assets',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    // Get the position of the drop
    const xdrop = event.nativeEvent.offsetX;
    const ydrop = event.nativeEvent.offsetY;
    setDropCursor({ x: event.clientX, y: event.clientY });
    setDropPosition({ x: xdrop, y: ydrop });

    if (event.dataTransfer.types.includes('Files') && event.dataTransfer.files.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      // Collect all the files dropped into an array
      collectFiles(event.dataTransfer)
        .then(async (files) => {
          if (!uploadInProgress) {
            toast.closeAll();
            // do the actual upload
            uploadFiles(Array.from(files), xdrop, ydrop, props.roomId, props.boardId);
          } else {
            toast({
              title: 'Upload in progress - Please wait',
              status: 'warning',
              duration: 4000,
              isClosable: true,
            });
          }
        })
        .catch((err) => {
          console.log('Error> uploading files', err);
          lotsOnOpen();
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
            const title = event.dataTransfer.getData('title') || 'Image';
            // it's a base64 image
            getImageDimensionsFromBase64(pastedText).then((res) => {
              const ar = res.w / res.h;
              let w = res.w;
              let h = w / ar;
              if (ar < 1) {
                w = res.h * ar;
                h = res.h;
              }
              createApp(setupApp(title, 'ImageViewer', xdrop, ydrop, props.roomId, props.boardId, { w, h }, { assetid: pastedText }));
            });
          } else {
            // Is it a valid URL
            const valid = isValidURL(pastedText);
            if (valid) {
              // Create a link or view app
              popOnOpen();
              setValidURL(valid);
            }
          }
        }
      } else {
        // if no files were dropped, create an application
        const appName = event.dataTransfer.getData('app') as AppName;
        if (appName) {
          // if a specific app was setup, create it
          const appstatestr = event.dataTransfer.getData('app_state');
          if (appstatestr) {
            const appstate = JSON.parse(appstatestr);
            const newState = {
              title: user.data.name,
              roomId: props.roomId,
              boardId: props.boardId,
              position: { x: xdrop, y: ydrop, z: 0 },
              size: { width: 600, height: 400, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: appName,
              state: { ...(initialValues[appName] as AppState), ...appstate },
              raised: true,
              dragging: false,
              pinned: false,
            };
            createApp(newState);
          } else {
            newApp(appName, xdrop, ydrop);
          }
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
      // Open the help panel
      helpOnOpen();
      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    { dependencies: [] }
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
    { dependencies: [selectedAppId, boardPosition.x, boardPosition.y] }
  );

  // Zoom in/out of the board with the -/+ keys
  useHotkeys(
    '-, =',
    (event: KeyboardEvent): void | boolean => {
      if (selectedAppId !== '') return;
      if (event.key === '-') {
        zoomOutDelta(-10, cursor);
      } else if (event.key === '=') {
        zoomInDelta(10, cursor);
      }
      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    { dependencies: [selectedAppId] }
  );

  // Throttle stickie hotkey event
  const throttleStickieCreation = throttle(1000, (x: number, y: number) => {
    if (!user) return;
    createApp(
      setupApp(user.data.name, 'Stickie', x, y, props.roomId, props.boardId, { w: 400, h: 420 }, { color: user.data.color || 'yellow' })
    );
  });
  const throttleStickieCreationRef = useCallback(throttleStickieCreation, [user]);

  // Stickies Shortcut
  useHotkeys(
    'shift+s',
    (event: KeyboardEvent): void | boolean => {
      event.stopPropagation();
      const x = boardCursor.x;
      const y = boardCursor.y;
      throttleStickieCreationRef(x, y);
      // Returning false stops the event and prevents default browser events
      return false;
    },
    // Depends on the cursor to get the correct position
    { dependencies: [] }
  );

  useEffect(() => {
    // if app selected, don't allow lasso, othwerwise it consumes the event away from the app
    if (selectedAppId !== '') return;

    // if (isShiftPressed) {
    //   document.onselectstart = function () {
    //     return false;
    //   };
    // }

    setLassoMode(isShiftPressed);
  }, [isShiftPressed]);

  const createWeblink = () => {
    createApp(
      setupApp(
        'WebpageLink',
        'WebpageLink',
        dropPosition.x,
        dropPosition.y,
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
      setupApp('Webview', 'Webview', dropPosition.x, dropPosition.y, props.roomId, props.boardId, { w: w, h: h }, { webviewurl: final_url })
    );
    popOnClose();
  };

  const touchpadPan = (evt: any) => {
    // DeltaX and DeltaY
    const deltaX = evt.deltaX / scale;
    const deltaY = evt.deltaY / scale;
    // Now pan the board
    setBoardPosition({ x: boardPosition.x - deltaX, y: boardPosition.y - deltaY });
  };

  const touchpadZoom = (evt: any) => {
    const cursor = { x: evt.clientX, y: evt.clientY };
    if (evt.deltaY < 0) {
      zoomInDelta(evt.deltaY, cursor);
    } else if (evt.deltaY > 0) {
      zoomOutDelta(evt.deltaY, cursor);
    }
  };

  const mouseZoom = (evt: any) => {
    const cursor = { x: evt.clientX, y: evt.clientY };
    if (evt.deltaY < 0) {
      zoomInDelta(evt.deltaY, cursor);
    } else if (evt.deltaY > 0) {
      zoomOutDelta(evt.deltaY, cursor);
    }
  };

  // Throttle The wheel event
  const throttleZoom = throttle(0, (evt: any) => {
    if (isTouchpad) {
      touchpadZoom(evt);
    } else {
      mouseZoom(evt);
    }
  });
  const throttleZoomRef = useCallback(throttleZoom, [inputType]);
  const onWheelEvent = (ev: any) => {
    ev.stopPropagation();
    if (isTouchpad) {
      if (ev.ctrlKey) {
        throttleZoomRef(ev);
      } else {
        touchpadPan(ev);
      }
    } else {
      throttleZoomRef(ev);
    }
  };

  return (
    <Box
      className="board-handle"
      // background="red"
      width="100%"
      height="100%"
      backgroundSize={'100px 100px'}
      bgImage={`linear-gradient(to right, ${gridColor} ${1 / scale}px, transparent ${
        1 / scale
      }px), linear-gradient(to bottom, ${gridColor} ${1 / scale}px, transparent ${1 / scale}px);`}
      id="board-background"
      cursor={boardDragging ? 'grabbing' : 'auto'}
      // Drag and drop event handlers
      onDrop={OnDrop}
      onDragOver={OnDragOver}
      onScroll={(evt) => {
        evt.preventDefault();
        evt.stopPropagation();
      }}
      onWheel={onWheelEvent}
      zIndex={100000}
      onMouseDown={(ev) => {
        if (ev.button !== 1) {
          ev.preventDefault();
          ev.stopPropagation();
        }
      }}
    >
      <HelpModal onClose={helpOnClose} isOpen={helpIsOpen}></HelpModal>

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
      {/* Lasso */}
      {canLasso && <Lasso boardId={props.boardId} />}
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
    if (length > 20) {
      reject('Too many files');
      return;
    }

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

/**
 * Get the dimensions of an image from a base64 string
 *
 * @export
 * @param {string} file
 * @returns {Promise<{w: number, h: number}>}
 */
function getImageDimensionsFromBase64(file: string): Promise<{ w: number; h: number }> {
  return new Promise(function (resolved, rejected) {
    var i = new Image();
    i.onload = function () {
      resolved({ w: i.width, h: i.height });
    };
    i.src = file;
  });
}

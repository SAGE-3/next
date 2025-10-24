/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ReactNode, useCallback, useMemo, useState } from 'react';
import {
  Button,
  useToast,
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
  useAppStore,
  useUser,
  useAuth,
  useFiles,
  isValidURL,
  setupApp,
  useAbility,
  processContentURL,
  useLinkStore,
} from '@sage3/frontend';

import { initialValues } from '@sage3/applications/initialValues';
import { AppName, AppSchema, AppState } from '@sage3/applications/schema';

type useDragAndDropBoardProps = {
  roomId: string;
  boardId: string;
};

export const useDragAndDropBoard = (props: useDragAndDropBoardProps) => {
  // Display some notifications
  const toast = useToast();

  // Modal for opening lots of files
  const { isOpen: lotsIsOpen, onOpen: lotsOnOpen, onClose: lotsOnClose } = useDisclosure();
  // Popover

  const { isOpen: popIsOpen, onOpen: popOnOpen, onClose: popOnClose } = useDisclosure();

  // Hooks
  const { uploadFiles, openAppForFile, uploadInProgress } = useFiles();

  // How to create some applications
  const createApp = useAppStore((state) => state.create);
  const createBatch = useAppStore((state) => state.createBatch);

  // Links
  const addLink = useLinkStore((state) => state.addLink);

  // User
  const { user, accessId } = useUser();
  const { auth } = useAuth();

  // Abilities
  const canDrop = useAbility('upload', 'assets');

  const [dropPosition, setDropPosition] = useState({ x: 0, y: 0 });
  const [dropCursor, setDropCursor] = useState({ x: 0, y: 0 });
  const [validURL, setValidURL] = useState('');

  // Start dragging
  const OnDragOver = useCallback((event: React.DragEvent<HTMLOrSVGElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const newApp = (type: AppName, w: number, h: number, x: number, y: number) => {
    if (!user) return;
    if (type === 'Screenshare') {
      createApp(setupApp('', type, x, y, props.roomId, props.boardId, { w: 1280, h: 720 }, { accessId }));
    } else {
      createApp(setupApp('', type, x, y, props.roomId, props.boardId, { w, h }));
    }
  };

  // Drop event
  const OnDrop = useCallback(
    async (event: React.DragEvent<HTMLOrSVGElement>) => {
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
            if (pastedText.startsWith('data:image/png;base64') || pastedText.startsWith('data:image/jpeg;base64')) {
              const appState = event.dataTransfer.getData('app_state');
              if (!appState) return;
              const parsedState = JSON.parse(appState);
              const title = parsedState.title;
              const sources = parsedState.sources;
              // it's a base64 image
              getImageDimensionsFromBase64(pastedText).then(async (res) => {
                const ar = res.w / res.h;
                let w = res.w;
                let h = w / ar;
                if (ar < 1) {
                  w = res.h * ar;
                  h = res.h;
                }
                const r = await createApp(
                  setupApp(title, 'ImageViewer', xdrop, ydrop, props.roomId, props.boardId, { w, h }, { assetid: pastedText })
                );
                if (r.success) {
                  if (sources && sources.length) {
                    const tId = r.data._id;
                    const sId = sources[0];
                    addLink(sId, tId, props.boardId, 'provenance');
                  }
                }
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
            // Setup initial size
            let w = 600;
            let h = 400;
            if (appName === 'SageCell') {
              w = 650;
              h = 400;
            } else if (appName === 'Timer') {
              w = 330;
              h = 226;
            } else if (appName === 'Calculator') {
              w = 260;
              h = 369;
            } else if (appName === 'Chat') {
              w = 800;
              h = 420;
            } else if (appName === 'Clock') {
              w = 320 * 1.5;
              h = 130 * 1.5;
            }
            // if a specific app was setup, create it
            const appstatestr = event.dataTransfer.getData('app_state');
            if (appstatestr) {
              const appstate = JSON.parse(appstatestr);
              const newState = {
                title: user.data.name,
                roomId: props.roomId,
                boardId: props.boardId,
                position: { x: xdrop, y: ydrop, z: 0 },
                size: { width: w, height: h, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: appName,
                state: { ...(initialValues[appName] as AppState), ...appstate },
                raised: true,
                dragging: false,
                pinned: false,
              };
              const res = await createApp(newState);
              if (res.success) {
                if (appstate.sources && appstate.sources.length) {
                  const tId = res.data._id;
                  const sId = appstate.sources[0];
                  addLink(sId, tId, props.boardId, 'provenance');
                }
              }
            } else {
              newApp(appName, w, h, xdrop, ydrop);
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
                  const res = await openAppForFile(fileIDs[i], xpos, ydrop, props.roomId, props.boardId);
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
    },
    [user?.data.userRole, canDrop]
  );

  const createWeblink = useCallback(() => {
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
  }, [createApp, dropPosition.x, dropPosition.y, props.roomId, props.boardId, validURL, popOnClose]);

  function isImageUrl(url: string) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const ext = url.split('.').pop();
    if (ext) {
      const extension = ext.toLowerCase().split('?')[0];
      return imageExtensions.includes(extension);
    }
    return false;
  }

  const createWebview = useCallback(() => {
    if (isImageUrl(validURL)) {
      createApp(
        setupApp(
          'ImageViewer',
          'ImageViewer',
          dropPosition.x,
          dropPosition.y,
          props.roomId,
          props.boardId,
          { w: 800, h: 800 },
          { assetid: validURL }
        )
      );
    } else {
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
          dropPosition.x,
          dropPosition.y,
          props.roomId,
          props.boardId,
          { w: w, h: h },
          { webviewurl: final_url }
        )
      );
    }
    popOnClose();
  }, [createApp, dropPosition.x, dropPosition.y, props.roomId, props.boardId, validURL, popOnClose]);

  const renderContent = useCallback(
    (): ReactNode => (
      <>
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
      </>
    ),
    [popIsOpen, popOnOpen, popOnClose, dropCursor.x, dropCursor.y, createWeblink, createWebview, lotsIsOpen, lotsOnClose]
  );

  const dragProps = useMemo(
    () => ({
      onDrop: OnDrop,
      onDragOver: OnDragOver,
    }),
    [OnDrop, OnDragOver]
  );

  return {
    dragProps,
    renderContent,
  };
};
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

    // WARNING: this can be easily bypassed by stored a bunch of files in a folder and then uploading the folder...
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

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Handling copy/paste events on a board
 */

import { useEffect, useState } from 'react';
import { useToast, useDisclosure, Popover, Portal, PopoverContent, PopoverHeader, PopoverBody, Button, Center } from '@chakra-ui/react';

import { useUser, useAuth, useAppStore, useCursorBoardPosition, useUIStore } from '@sage3/frontend';
import { initialValues } from '@sage3/applications/initialValues';
import { isValidURL, setupApp, processContentURL, truncateWithEllipsis } from '@sage3/frontend';

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
  const [validURL, setValidURL] = useState('');
  // Popover
  const { isOpen: popIsOpen, onOpen: popOnOpen, onClose: popOnClose } = useDisclosure();
  const [dropCursor, setDropCursor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!user) return;

    const pasteHandlerBoard = (event: ClipboardEvent) => {
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

      // Open webview if url, otherwise, open a sticky
      if (event.clipboardData?.files) {
        if (event.clipboardData.files.length > 0) {
          // Iterate over all pasted files.
          Array.from(event.clipboardData.files).forEach(async (file) => {
            if (file.type.startsWith('image/')) {
              // Images not supported yet
              toast({
                title: 'Copy/Paste Handler',
                description: 'Image clipboard not supported yet',
                status: 'error',
                duration: 2 * 1000,
                isClosable: true,
              });

              // Works but slow
              // For images, create an image and append it to the `body`.
              // const reader = new FileReader();
              // reader.readAsDataURL(file);
              // reader.onloadend = function () {
              //   const base64data = reader.result;
              //   if (base64data && typeof base64data === 'string') {
              //     if (base64data.length < 100000) {
              //       // it's a base64 image
              //       createApp({
              //         title: file.name,
              //         roomId: props.roomId,
              //         boardId: props.boardId,
              //         position: { x: xDrop, y: yDrop, z: 0 },
              //         size: { width: 800, height: 600, depth: 0 },
              //         rotation: { x: 0, y: 0, z: 0 },
              //         type: 'ImageViewer',
              //         state: { ...(initialValues['ImageViewer'] as AppState), assetid: base64data },
              //         raised: true,
              //         pinned: false,
              //         dragging: false,
              //       });
              //     }
              //   }
              // };
            } else if (file.type.startsWith('text/')) {
              // Read the text
              const textcontent = await file.text();
              // Create a new stickie with the text
              createApp({
                title: truncateWithEllipsis(textcontent, 20),
                roomId: props.roomId,
                boardId: props.boardId,
                position: { x: xDrop, y: yDrop, z: 0 },
                size: { width: 400, height: 400, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'Stickie',
                state: { ...initialValues['Stickie'], text: textcontent, fontSize: 24, color: user.data.color || 'yellow' },
                raised: true,
                dragging: false,
                pinned: false,
              });
            } else {
              // Not supported file format
              toast({
                title: 'Copy/Paste Handler',
                description: 'File format not supported yet',
                status: 'error',
                duration: 2 * 1000,
                isClosable: true,
              });
            }
          });
        }
      }

      // Get content of clipboard
      const pastedText = event.clipboardData?.getData('Text');

      // if there's content
      if (pastedText) {
        // check and validate the URL
        const isValid = isValidURL(pastedText.trim());
        // If the start of pasted text is http, can assume is a url
        if (isValid) {
          if (pastedText.startsWith('https://drive.google.com')) {
            console.log('Google Drive link detected');
          } else {
            setValidURL(isValid);
            popOnOpen();
          }
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
          // if SVG, create an image viewer
          if (pastedText.startsWith('<svg xmlns')) {
            // weird conversion to base64, but needed to handle unicode characters
            const processed = btoa(unescape(encodeURIComponent(pastedText)));
            const src = 'data:image/svg+xml;base64,' + processed;
            // Create an image with the svg
            createApp({
              title: 'SVG - pasted',
              roomId: props.roomId,
              boardId: props.boardId,
              position: { x: xDrop, y: yDrop, z: 0 },
              size: { width: 400, height: 400, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'ImageViewer',
              state: { ...initialValues['ImageViewer'], assetid: src },
              raised: true,
              dragging: false,
              pinned: false,
            });
          } else {
            // else use the text to create a new stickie
            createApp({
              title: truncateWithEllipsis(pastedText, 20),
              roomId: props.roomId,
              boardId: props.boardId,
              position: { x: xDrop, y: yDrop, z: 0 },
              size: { width: 400, height: 400, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'Stickie',
              state: { ...initialValues['Stickie'], text: pastedText, fontSize: 42, color: user.data.color || 'yellow' },
              raised: true,
              dragging: false,
              pinned: false,
            })
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

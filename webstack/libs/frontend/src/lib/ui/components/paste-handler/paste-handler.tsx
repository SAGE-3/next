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

import { useEffect } from 'react';
import { useToast } from '@chakra-ui/react';

import { useUser, useAuth, useAppStore, useCursorBoardPosition, useUIStore } from '@sage3/frontend';
import { processContentURL, isValidURL } from '@sage3/frontend';

import { initialValues } from '@sage3/applications/initialValues';
import { AppState } from '@sage3/applications/schema';

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
  const { position: cursorPosition } = useCursorBoardPosition();
  // App Store
  const createApp = useAppStore((state) => state.create);
  // UI Store
  const selectedApp = useUIStore((state) => state.selectedAppId);

  useEffect(() => {
    if (!user) return;

    const pasteHandlerReachingDocumentBody = (event: ClipboardEvent) => {
      // get the target element and make sure it is the background board
      // const elt = event.target as HTMLElement;
      // if (elt.id !== 'board') return;
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

      // Open webview if url, otherwise, open a sticky
      if (event.clipboardData?.files) {
        if (event.clipboardData.files.length > 0) {
          // Iterate over all pasted files.
          Array.from(event.clipboardData.files).forEach(async (file) => {
            if (file.type.startsWith('image/')) {
              // For images, create an image and append it to the `body`.
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onloadend = function () {
                const base64data = reader.result;
                // it's a base64 image
                createApp({
                  title: file.name,
                  roomId: props.roomId,
                  boardId: props.boardId,
                  position: { x: xDrop, y: yDrop, z: 0 },
                  size: { width: 800, height: 600, depth: 0 },
                  rotation: { x: 0, y: 0, z: 0 },
                  type: 'ImageViewer',
                  state: { ...(initialValues['ImageViewer'] as AppState), assetid: base64data },
                  raised: true,
                  dragging: false,
                });
              };
            } else if (file.type.startsWith('text/')) {
              // Read the text
              const textcontent = await file.text();
              // Create a new stickie with the text
              createApp({
                title: user.data.name,
                roomId: props.roomId,
                boardId: props.boardId,
                position: { x: xDrop, y: yDrop, z: 0 },
                size: { width: 400, height: 400, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'Stickie',
                state: { text: textcontent, fontSize: 42, color: user.data.color || 'yellow' },
                raised: true,
                dragging: false,
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
              // return;
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
          let w = 800;
          let h = 800;
          const final_url = processContentURL(isValid);
          if (isValid !== final_url) {
            // it has been changed, it must be a video
            w = 1280;
            h = 720;
          }
          // Create a webview
          createApp({
            title: final_url,
            roomId: props.roomId,
            boardId: props.boardId,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: 400, height: 400, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'WebpageLink',
            state: { ...initialValues['WebpageLink'], url: processContentURL(final_url) },
            raised: true,
            dragging: false,
          });
        } else if (pastedText.startsWith('sage3://')) {
          // Create a board link app
          createApp({
            title: user.data.name,
            roomId: props.roomId,
            boardId: props.boardId,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: 400, height: 375, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'BoardLink',
            state: { url: pastedText },
            raised: true,
            dragging: false,
          });
        } else {
          // Create a new stickie
          createApp({
            title: user.data.name,
            roomId: props.roomId,
            boardId: props.boardId,
            position: { x: xDrop, y: yDrop, z: 0 },
            size: { width: 400, height: 400, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Stickie',
            state: { text: pastedText, fontSize: 42, color: user.data.color || 'yellow' },
            raised: true,
            dragging: false,
          });
        }
      }
    };

    // Add the handler to the whole page
    document.addEventListener('paste', pasteHandlerReachingDocumentBody);

    return () => {
      // Remove function during cleanup to prevent multiple additions
      document.removeEventListener('paste', pasteHandlerReachingDocumentBody);
    };
  }, [cursorPosition.x, cursorPosition.y, props.boardId, props.roomId, user, selectedApp]);

  return <></>;
};

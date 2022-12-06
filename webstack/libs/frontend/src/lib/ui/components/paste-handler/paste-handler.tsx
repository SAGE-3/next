/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Handling copy/paste events on a board
 */

import { useEffect } from 'react';
import { useToast } from '@chakra-ui/react';

import { useUser, useUIStore, useAppStore, useCursorBoardPosition } from '@sage3/frontend';
import { processContentURL } from '@sage3/frontend';

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
  const { position: cursorPosition } = useCursorBoardPosition();
  // UI Store
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);
  // App Store
  const createApp = useAppStore((state) => state.create);

  useEffect(() => {
    if (!user) return;

    const pasteHandlerReachingDocumentBody = (event: ClipboardEvent) => {
      // get the target element and make sure it is the background board
      const elt = event.target as HTMLElement;
      if (elt.id !== 'board') return;

      // Open webview if url, otherwise, open a sticky
      if (event.clipboardData?.files) {
        if (event.clipboardData.files.length > 0) {
          toast({
            title: 'Copy/Paste Handler',
            description: 'Pasting file not supported yet',
            status: 'error',
            duration: 2 * 1000,
            isClosable: true,
          });
          return;
        }
      }

      // Get content of clipboard
      const pastedText = event.clipboardData?.getData('Text');

      // Get the user cursor position
      const xDrop = cursorPosition.x;
      const yDrop = cursorPosition.y;

      // if there's content
      if (pastedText) {
        // check and validate the URL
        const isValid = isValidURL(pastedText);
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
            size: { width: w, height: h, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Webview',
            state: { webviewurl: final_url },
            raised: true,
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
  }, [cursorPosition.x, cursorPosition.y, props.boardId, props.roomId]);

  return <></>;
};

/**
 * Validate a URL string
 * From github.com/ogt/valid-url but not maintained
 * @param {string} value
 * @returns {(string | undefined)}
 */
function isValidURL(value: string): string | undefined {
  if (!value) {
    return;
  }

  // check for illegal characters
  if (/[^a-z0-9\:\/\?\#\[\]\@\!\$\&\'\ʻ\(\)\*\+\,\;\=\.\-\_\~\%]/i.test(value)) return;

  // check for hex escapes that aren't complete
  if (/%[^0-9a-f]/i.test(value)) return;
  if (/%[0-9a-f](:?[^0-9a-f]|$)/i.test(value)) return;

  let scheme = '';
  let authority = '';
  let path = '';
  let query = '';
  let fragment = '';
  let out = '';

  // from RFC 3986
  const splitted = splitUri(value);
  if (!splitted) return;
  scheme = splitted[1];
  authority = splitted[2];
  path = splitted[3];
  query = splitted[4];
  fragment = splitted[5];

  // scheme and path are required, though the path can be empty
  if (!(scheme && scheme.length && path.length >= 0)) return;

  // if authority is present, the path must be empty or begin with a /
  if (authority && authority.length) {
    if (!(path.length === 0 || /^\//.test(path))) return;
  } else {
    // if authority is not present, the path must not start with //
    if (/^\/\//.test(path)) return;
  }

  // scheme must begin with a letter, then consist of letters, digits, +, ., or -
  if (!/^[a-z][a-z0-9\+\-\.]*$/.test(scheme.toLowerCase())) return;

  // Disable some protocols: chrome sage3
  if (scheme === 'sage3' || scheme === 'chrome') {
    return;
  }

  // re-assemble the URL per section 5.3 in RFC 3986
  out += scheme + ':';
  if (authority && authority.length) {
    out += '//' + authority;
  }

  out += path;

  if (query && query.length) {
    out += '?' + query;
  }

  if (fragment && fragment.length) {
    out += '#' + fragment;
  }

  return out;
}

/**
 * URI spitter method - direct from RFC 3986
 * @param {string} uri
 * @returns RegExpMatchArray
 */
function splitUri(uri: string) {
  const splitted = uri.match(/(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/);
  return splitted;
}

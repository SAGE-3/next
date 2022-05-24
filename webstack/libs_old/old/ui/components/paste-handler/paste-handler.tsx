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

import React, { useEffect } from 'react';
import { useAction, usePanZoom } from '@sage3/frontend/services';
import { useToast } from '@chakra-ui/react';
import { processContentURL } from '@sage3/frontend/utils/misc'

/**
 * PasteHandler component
 * @param {any} props
 * @returns JSX.Element
 */
export const PasteHandler = (): JSX.Element => {
  // Handle to create applications
  const { act } = useAction();
  // Location on the board
  const [panZoomState] = usePanZoom();

  const toast = useToast()

  useEffect(() => {
    const pasteHandlerReachingDocumentBody = (event: ClipboardEvent) => {
      // Open webview if url, otherwise, open a sticky
      if (event.clipboardData?.files) {
        if (event.clipboardData.files.length > 0) {
          toast({
            title: 'Copy/Paste Handler',
            description: 'Pasting file not supported yet',
            status: 'error',
            duration: 2 * 1000,
            isClosable: true,
          })
          return;
        }
      }
      // Get content of clipboard
      const pastedText = event.clipboardData?.getData("Text");
      // Calculate location to create
      const x = panZoomState.motionX.get() - ((window.innerWidth / panZoomState.motionScale.get()) / 2);
      const y = panZoomState.motionY.get() - ((window.innerHeight / panZoomState.motionScale.get()) / 2);
      // if there's content
      if (pastedText) {
        // check and validate the URL
        const isValid = isValidURL(pastedText);
        // If the start of pasted text is http, can assume is a url
        if (isValid) {
          // Create a webview
          act({
            type: 'create',
            // Must match name declared in libs/applications/src/metadata.ts
            appName: 'webview',
            // Conflict, MenuBar says '', but DragOverlay says 'new-app'
            id: '',
            position: { x: -x, y: -y },
            optionalData: {
              address: {
                history: [processContentURL(isValid)],
                historyIdx: 0,
              },
              visual: {
                zoom: 1.0, scrollX: 0, scrollY: 0,
              }
            },
          });
        } else {
          // Create a postit note
          act({
            type: 'create',
            // Must match name declared in libs/applications/src/metadata.ts
            appName: "stickies",
            // Conflict, MenuBar says '', but DragOverlay says 'new-app'
            id: '',
            position: { x: -x, y: -y },
            optionalData: { value: { text: pastedText, color: '#ffff97' } },
          });
        }
      }
    };

    // Add the handler to the whole page
    document.addEventListener("paste", pasteHandlerReachingDocumentBody);

    return (() => {
      // Remove function during cleanup to prevent multiple additions
      document.removeEventListener("paste", pasteHandlerReachingDocumentBody);
    });
  }, [panZoomState]);

  return (<></>);
}

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
};

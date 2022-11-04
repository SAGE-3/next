/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useRef, useState } from 'react';
import { ButtonGroup, Button, Tooltip, Box, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';

// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';

// Utility functions from SAGE3
import { downloadFile, useAppStore } from '@sage3/frontend';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

// Styles
import 'quill/dist/quill.snow.css';
import './styles.css';

// SAGE Imports
import { useUser } from '@sage3/frontend';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '@sage3/applications/schema';

import { MdFileDownload, MdOutlineFormatListNumbered, MdOutlineList } from 'react-icons/md';

// Have to register the module before using it
Quill.register('modules/cursors', QuillCursors);

// Store between the app and the toolbar
import create from 'zustand';

export const useStore = create((set: any) => ({
  editor: {} as { [key: string]: Quill },
  setEditor: (id: string, ed: Quill) => set((s: any) => ({ editor: { ...s.editor, ...{ [id]: ed } } })),
}));

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const quillRef = useRef(null);
  const toolbarRef = useRef(null);
  const { user } = useUser();
  const setEditor = useStore((s: any) => s.setEditor);
  const updateState = useAppStore((state) => state.updateState);

  useEffect(() => {
    // Setup Yjs stuff
    let provider: WebsocketProvider | null = null;
    let ydoc: Y.Doc | null = null;
    let binding: QuillBinding | null = null;
    if (quillRef.current && toolbarRef.current) {
      const quill = new Quill(quillRef.current, {
        modules: {
          // cursors: true,
          cursors: false, // for now, tracking quill bug with transforms
          toolbar: toolbarRef.current,
          history: {
            // Local undo shouldn't undo changes from remote users
            userOnly: true,
          },
        },
        scrollingContainer: '#scrolling-container',
        placeholder: 'Start collaborating...',
        theme: 'snow', // 'bubble' is also great
      });
      // Save the instance for the toolbar
      setEditor(props._id, quill);

      // A Yjs document holds the shared data
      ydoc = new Y.Doc();

      // WS Provider
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      provider = new WebsocketProvider(`${protocol}://${window.location.host}/yjs`, props._id, ydoc);

      // Define a shared text type on the document
      const ytext = ydoc.getText('quill');

      // Observe changes on the text, if user is source of the change, update sage
      quill.on('text-change', (delta, oldDelta, source) => {
        if (source == 'user') {
          const text = ytext.toString();
          updateState(props._id, { text });
        }
      });

      // "Bind" the quill editor to a Yjs text type.
      // Uses SAGE3 information to set the color of the cursor
      binding = new QuillBinding(ytext, quill, provider.awareness);
      if (user) {
        provider.awareness.setLocalStateField('user', {
          name: user.data.name,
          color: user.data.color, // should be a hex color
        });
      }

      // Sync state with sage when a user connects and is the only one present
      provider.on('sync', () => {
        if (provider) {
          const users = provider.awareness.getStates();
          const count = users.size;
          if (count === 1) {
            const text = ytext.toString();
            if (text !== s.text) {
              ytext.delete(0, ytext.length);
              ytext.insert(0, s.text);
            }
          }
        }
      });
    }
    return () => {
      // Remove the bindings and disconnect the provider
      if (ydoc) ydoc.destroy();
      if (binding) binding.destroy();
      if (provider) provider.disconnect();
    };
  }, [quillRef, toolbarRef]);

  return (
    <AppWindow app={props}>
      <Box position="relative" width="100%" height="100%" backgroundColor="#e5e5e5">
        <div ref={toolbarRef}>
          <button className="ql-bold" id={`bold-${props._id}`}></button>
          <button className="ql-italic" id={`italic-${props._id}`}></button>
          <button className="ql-underline" id={`underline-${props._id}`}></button>
          <button className="ql-strike" id={`strike-${props._id}`}></button>
          <button className="ql-list" id={`listordered-${props._id}`} value="ordered"></button>
          <button className="ql-list" id={`listbullet-${props._id}`} value="bullet"></button>
        </div>
        <div ref={quillRef}></div>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app SVGBox */

function ToolbarComponent(props: App): JSX.Element {
  // const s = props.data.state as AppState;
  const editor: Quill = useStore((state: any) => state.editor[props._id]);
  editor;
  // Download the content as an HTML file
  const downloadHTML = () => {
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    const header = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>SAGE3 Notepad - ${dt}</title>
        <link rel="stylesheet" href="https://cdn.quilljs.com/latest/quill.snow.css"/>
      </head>
      <body>
      <div class="ql-snow ql-container">\n`;
    const footer = `\n</div></body></html>`;
    // Add HTML header and footer
    const content = header + editor.root.innerHTML + footer;
    // Generate a URL containing the text of the document
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with username and date
    const filename = 'notepad-' + dt + '.html';
    // Go for download
    downloadFile(txturl, filename);
  };

  const quillFormatText = (value: 'bold' | 'italic' | 'underline' | 'strike') => {
    const range = editor.getSelection();
    if (range) {
      if (range.length > 0) {
        const currentFormat = editor.getFormat(range);
        console.log(currentFormat);
        const format = currentFormat[value] ? !currentFormat[value] : true;
        editor.formatText(range.index, range.length, value, format);
      }
    }
  };

  const quillFormatLine = (value: 'bullet' | 'ordered') => {
    const range = editor.getSelection();
    if (range) {
      if (range.length > 0) {
        const currentFormat = editor.getFormat(range);
        const format = currentFormat['list'] === value ? '' : value;
        editor.formatLine(range.index, range.length, 'list', format);
      }
    }
  };

  const fontSizeClick = (size: string) => {
    editor.format('size', size);
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top" hasArrow={true} label={'Bold'} openDelay={400}>
          <Button onClick={() => quillFormatText('bold')}>B</Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Italic'} openDelay={400}>
          <Button onClick={() => quillFormatText('italic')}>
            <i>I</i>
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Underline'} openDelay={400}>
          <Button onClick={() => quillFormatText('underline')}>
            <u>U</u>
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Strike'} openDelay={400}>
          <Button onClick={() => quillFormatText('strike')}>
            <s>S</s>
          </Button>
        </Tooltip>
      </ButtonGroup>
      <Menu>
        <Tooltip placement="top" hasArrow={true} label={'Font Size'} openDelay={400}>
          <MenuButton as={Button} size="xs" colorScheme="teal" mx="1">
            Font Size
          </MenuButton>
        </Tooltip>

        <MenuList>
          {/* MenuItems are not rendered unless Menu is open */}
          <MenuItem onClick={() => fontSizeClick('small')}>Small</MenuItem>
          <MenuItem onClick={() => fontSizeClick('large')}>Medium</MenuItem>
          <MenuItem onClick={() => fontSizeClick('huge')}>Large</MenuItem>
        </MenuList>
      </Menu>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top" hasArrow={true} label={'Bullet List'} openDelay={400}>
          <Button onClick={() => quillFormatLine('bullet')}>
            <MdOutlineList />
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Numbered List'} openDelay={400}>
          <Button onClick={(e) => quillFormatLine('ordered')}>
            <MdOutlineFormatListNumbered />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <Tooltip placement="top" hasArrow={true} label={'Download as HTML'} openDelay={400}>
        <Button onClick={downloadHTML} _hover={{ opacity: 0.7 }} size="xs" colorScheme="teal" mx="1">
          <MdFileDownload />
        </Button>
      </Tooltip>
    </>
  );
}

export default { AppComponent, ToolbarComponent };

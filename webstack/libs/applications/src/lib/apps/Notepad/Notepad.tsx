/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useRef } from 'react';
import { ButtonGroup, Button, Tooltip, Box, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';

// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';

// Utility functions from SAGE3
import { downloadFile, useAppStore, useHexColor, useUIStore } from '@sage3/frontend';
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

import {
  MdFileDownload,
  MdFormatAlignCenter,
  MdFormatAlignJustify,
  MdFormatAlignLeft,
  MdFormatAlignRight,
  MdOutlineFormatListNumbered,
  MdOutlineList,
} from 'react-icons/md';

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
          cursors: false,
          toolbar: toolbarRef.current,
          history: {
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
          const content = quill.getContents();
          updateState(props._id, { content });
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
            const content = quill.getContents();
            if (content.ops.length !== s.content.ops.length) {
              quill.setContents(s.content as any);
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
        <div ref={toolbarRef} hidden></div>
        <div ref={quillRef}></div>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app SVGBox */

function ToolbarComponent(props: App): JSX.Element {
  // const s = props.data.state as AppState;
  const editor: Quill = useStore((state: any) => state.editor[props._id]);
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

  // All those delicious SAGE Colors
  const red = useHexColor('red');
  const green = useHexColor('green');
  const blue = useHexColor('blue');
  const yellow = useHexColor('yellow');
  const orange = useHexColor('orange');
  const purple = useHexColor('purple');
  const pink = useHexColor('pink');
  const cyan = useHexColor('cyan');
  const teal = useHexColor('teal');
  const colors = [
    { value: '#000000', name: 'Black' },
    { value: '#ffffff', name: 'White' },
    { value: red, name: 'Red' },
    { value: pink, name: 'Pink' },
    { value: orange, name: 'Orange' },
    { value: yellow, name: 'Yellow' },
    { value: green, name: 'Green' },
    { value: teal, name: 'Teal' },
    { value: cyan, name: 'Cyan' },
    { value: blue, name: 'Blue' },
    { value: purple, name: 'Purple' },
    { value: '', name: 'Clear' },
  ];

  // Format the text selection
  const formatText = (value: 'bold' | 'italic' | 'underline' | 'strike') => {
    const range = editor.getSelection();
    if (range) {
      if (range.length > 0) {
        const currentFormat = editor.getFormat(range);
        const format = currentFormat[value] ? !currentFormat[value] : true;
        editor.formatText(range.index, range.length, value, format);
      }
    }
  };

  // Color the text selection
  const colorText = (property: 'color' | 'background', value: string) => {
    const range = editor.getSelection();
    if (range) {
      if (range.length > 0) {
        const currentFormat = editor.getFormat(range);
        const color = currentFormat[property] === value ? 'black' : value;
        editor.formatText(range.index, range.length, property, color);
      }
    }
  };

  // Format the line
  const formatLineList = (value: 'bullet' | 'ordered') => {
    const range = editor.getSelection();
    if (range) {
      if (range.length > 0) {
        const currentFormat = editor.getFormat(range);
        const format = currentFormat['list'] === value ? '' : value;
        editor.formatLine(range.index, range.length, 'list', format);
      }
    }
  };

  // Align the select lines
  const formatLineAlign = (value: '' | 'center' | 'right' | 'justify') => {
    const range = editor.getSelection();
    if (range) {
      if (range.length > 0) {
        const currentFormat = editor.getFormat(range);
        const format = currentFormat['align'] === value ? '' : value;
        editor.formatLine(range.index, range.length, 'align', format);
      }
    }
  };

  // Format the text selection size
  const fontSizeClick = (size: 'small' | 'large' | 'huge') => {
    editor.format('size', size);
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr="1">
        <Tooltip placement="top" hasArrow={true} label={'Bold'} openDelay={400}>
          <Button onClick={() => formatText('bold')}>B</Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Italic'} openDelay={400}>
          <Button onClick={() => formatText('italic')}>
            <i>I</i>
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Underline'} openDelay={400}>
          <Button onClick={() => formatText('underline')}>
            <u>U</u>
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Strike'} openDelay={400}>
          <Button onClick={() => formatText('strike')}>
            <s>S</s>
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Menu>
        <Tooltip placement="top" hasArrow={true} label={'Font Size'} openDelay={400}>
          <MenuButton as={Button} size="xs" colorScheme="teal" mx="1">
            Size
          </MenuButton>
        </Tooltip>

        <MenuList>
          <MenuItem onClick={() => fontSizeClick('small')}>Small</MenuItem>
          <MenuItem onClick={() => fontSizeClick('large')}>Medium</MenuItem>
          <MenuItem onClick={() => fontSizeClick('huge')}>Large</MenuItem>
        </MenuList>
      </Menu>

      <Menu>
        <Tooltip placement="top" hasArrow={true} label={'Font Size'} openDelay={400}>
          <MenuButton as={Button} size="xs" colorScheme="teal" mx="1">
            Color
          </MenuButton>
        </Tooltip>

        <MenuList>
          {/* MenuItems are not rendered unless Menu is open */}
          {colors.map((color) => (
            <MenuItem onClick={() => colorText('color', color.value)} key={props._id + color.value}>
              <Box w="16px" h="16px" bg={color.value} mr="2" borderRadius="100%" border="solid 1px black" backgroundColor={color.value} />
              {color.name}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>

      <Menu>
        <Tooltip placement="top" hasArrow={true} label={'Font Size'} openDelay={400}>
          <MenuButton as={Button} size="xs" colorScheme="teal" mx="1">
            Background
          </MenuButton>
        </Tooltip>

        <MenuList>
          {/* MenuItems are not rendered unless Menu is open */}
          {colors.map((color) => (
            <MenuItem onClick={() => colorText('background', color.value)} key={props._id + color.value}>
              <Box w="16px" h="16px" bg={color.value} mr="2" borderRadius="100%" border="solid 1px black" backgroundColor={color.value} />
              {color.name}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>

      <ButtonGroup isAttached size="xs" colorScheme="teal" mx="1">
        <Tooltip placement="top" hasArrow={true} label={'Align Left'} openDelay={400}>
          <Button onClick={() => formatLineAlign('')}>
            <MdFormatAlignLeft />
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Align Center'} openDelay={400}>
          <Button onClick={(e) => formatLineAlign('center')}>
            <MdFormatAlignCenter />
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Align Right'} openDelay={400}>
          <Button onClick={(e) => formatLineAlign('right')}>
            <MdFormatAlignRight />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Justify'} openDelay={400}>
          <Button onClick={(e) => formatLineAlign('justify')}>
            <MdFormatAlignJustify />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal" mx="1">
        <Tooltip placement="top" hasArrow={true} label={'Bullet List'} openDelay={400}>
          <Button onClick={() => formatLineList('bullet')}>
            <MdOutlineList />
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Numbered List'} openDelay={400}>
          <Button onClick={(e) => formatLineList('ordered')}>
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

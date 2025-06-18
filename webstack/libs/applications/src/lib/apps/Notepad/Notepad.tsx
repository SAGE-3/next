/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef } from 'react';
import { ButtonGroup, Button, Tooltip, Box, Menu, MenuButton, MenuList, MenuItem, useColorModeValue } from '@chakra-ui/react';

// Yjs Imports
import { QuillBinding } from 'y-quill';
import Quill from 'quill';

// Utility functions from SAGE3
import { downloadFile, useAppStore, useHexColor, useYjs, serverTime, YjsRoomConnection, useUser, PasteHandler } from '@sage3/frontend';
// Date manipulation (for filename)
import { format } from 'date-fns/format';

// Styles
import 'quill/dist/quill.snow.css';
import './styles.css';

// SAGE Imports
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
  MdRefresh,
} from 'react-icons/md';

import { debounce } from 'throttle-debounce';

// Store between the app and the toolbar
import { create } from 'zustand';
import { Global } from '@emotion/react';

const formats = [
  'background',
  'bold',
  'color',
  'font',
  'code',
  'italic',
  'link',
  'size',
  'strike',
  'script',
  'underline',
  'blockquote',
  'header',
  'indent',
  'list',
  'align',
  'direction',
  'code-block',
  'formula',
  // 'image'
  // 'video'
];

interface NotepadStore {
  editor: { [key: string]: Quill };
  setEditor: (id: string, ed: Quill) => void;
  reinit: { [key: string]: boolean };
  setReinit: (id: string, value: boolean) => void;
}

const useStore = create<NotepadStore>()((set) => ({
  editor: {} as { [key: string]: Quill },
  setEditor: (id: string, ed: Quill) => set((s) => ({ ...s, editor: { ...s.editor, ...{ [id]: ed } } })),
  reinit: {} as { [key: string]: boolean },
  setReinit: (id: string, value: boolean) => set((s) => ({ ...s, reinit: { ...s.reinit, ...{ [id]: value } } })),
}));

function AppComponent(props: App): JSX.Element {
  // user
  const { user } = useUser();

  // State
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Quill and Toolbar Refs
  const quillRef = useRef(null);
  const toolbarRef = useRef(null);

  // Set the editor in the Notepad Store
  const setEditor = useStore((s) => s.setEditor);

  // Yjs and Quill State
  const { yApps } = useYjs();

  // Background Color mode value
  const bgColorMode = useColorModeValue('#e5e5e5', 'gray.700');
  const placeHolderFontColor = useColorModeValue('black', 'white');

  // Scrollbar colors
  const trackColor = useColorModeValue('#e5e5e5', 'gray.700');
  const thumbColor = useColorModeValue('gray.200', 'gray.600');
  const trackColorHex = useHexColor(trackColor);
  const thumbColorHex = useHexColor(thumbColor);

  // Debounce Updates
  const debounceUpdate = debounce(1000, (quillEditor: Quill) => {
    const content = quillEditor.getContents();
    updateState(props._id, { content });
  });

  useEffect(() => {
    if (quillRef.current && toolbarRef.current && yApps) {
      connectToYjs(quillRef.current, toolbarRef.current, yApps);
    }
  }, [quillRef, toolbarRef, yApps]);

  const connectToYjs = async (quillReference: any, toolbarReference: any, yRoom: YjsRoomConnection) => {
    const yText = yRoom.doc.getText(props._id);
    const provider = yRoom.provider;

    // Quill Refs
    const quill = new Quill(quillReference, {
      modules: {
        toolbar: toolbarReference,
        history: {
          userOnly: true,
        },
      },
      placeholder: 'Start collaborating...',
      theme: 'snow',
      formats,
    });

    // Save the instance for the toolbar
    setEditor(props._id, quill);

    // Bind with Qull
    new QuillBinding(yText, quill);

    // Observe changes on the text, if user is source of the change, update sage
    quill.on('text-change', (delta, oldDelta, source) => {
      if (source == 'user' && quill) {
        debounceUpdate(quill);
      }
    });

    // Get the user count
    const users = provider.awareness.getStates();
    const count = users.size;

    // Sync current ydoc with that is saved in the database
    const syncStateWithDatabase = () => {
      quill.setContents(s.content as any);
    };

    // If I am the only one here according to Yjs, then sync with database
    if (count == 1) {
      syncStateWithDatabase();
    } else if (count > 1 && props._createdBy === user?._id) {
      // There are other users here and I created this app.
      // Is this app less than 5 seconds old...this feels hacky
      const now = await serverTime();
      const created = props._createdAt;
      const createdWithin5Seconds = now.epoch - created < 5000;
      // Then we need to sync with database due to Yjs not being able to catch the initial state
      if (createdWithin5Seconds) {
        // I created this
        syncStateWithDatabase();
      }
    }
  };

  return (
    <AppWindow app={props}>
      <Box w="100%" h="100%" background={bgColorMode}>
        <Global
          styles={{
            '.ql-editor.ql-blank::before': {
              color: placeHolderFontColor,
            },
            '.ql-editor::-webkit-scrollbar': {
              width: '24px',
              scrollbarGutter: 'stable',
            },
            '.ql-editor::-webkit-scrollbar-track': {
              background: trackColorHex,
              cursor: 'pointer',
              borderRadius: '8px',
            },
            '.ql-editor::-webkit-scrollbar-thumb': {
              backgroundColor: thumbColorHex,
              borderRadius: '8px',
              border: `2px solid ${trackColorHex}`,
              cursor: 'pointer',
            },
          }}
        />
        <div ref={toolbarRef} hidden style={{ display: 'none' }}></div>
        <div ref={quillRef} style={{ width: '100%', height: '100%', backgroundColor: '' }}></div>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app SVGBox */

function ToolbarComponent(props: App): JSX.Element {
  // const s = props.data.state as AppState;
  const editor: Quill = useStore((state) => state.editor[props._id]);

  // Reinitialize the editor when the user clicks refresh
  const setReinit = useStore((s) => s.setReinit);
  const reinit = useStore((s) => s.reinit[props._id]);

  // Download the content as an HTML file
  const downloadHTML = () => {
    // Current date
    const dt = format(new Date(), 'yyyy-MM-dd-HH:mm:ss');
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
        <Tooltip placement="top" hasArrow={true} label={'Font Color'} openDelay={400}>
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
        <Tooltip placement="top" hasArrow={true} label={'Font Background'} openDelay={400}>
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
          <Button onClick={() => formatLineAlign('center')}>
            <MdFormatAlignCenter />
          </Button>
        </Tooltip>

        <Tooltip placement="top" hasArrow={true} label={'Align Right'} openDelay={400}>
          <Button onClick={() => formatLineAlign('right')}>
            <MdFormatAlignRight />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Justify'} openDelay={400}>
          <Button onClick={() => formatLineAlign('justify')}>
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
          <Button onClick={() => formatLineList('ordered')}>
            <MdOutlineFormatListNumbered />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <Tooltip placement="top" hasArrow={true} label={'Download as HTML'} openDelay={400}>
        <Button onClick={downloadHTML} size="xs" colorScheme="teal" mx="1">
          <MdFileDownload />
        </Button>
      </Tooltip>
      <Tooltip placement="top" hasArrow={true} label={'Attempt to reconnect the Notepad'} openDelay={400}>
        <Button onClick={() => setReinit(props._id, !reinit)} size="xs" colorScheme="teal" mx="1">
          <MdRefresh />
        </Button>
      </Tooltip>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

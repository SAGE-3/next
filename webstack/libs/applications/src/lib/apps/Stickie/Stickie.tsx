/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Import the React library
import { useState, useRef, useEffect } from 'react';
import { Box, Button, ButtonGroup, HStack, Textarea, Tooltip } from '@chakra-ui/react';

import { ColorPicker, useAppStore, useHexColor, useUIStore, useUser, useUsersStore } from '@sage3/frontend';
import { App } from '../../schema';

import { state as AppState } from './';

// Debounce updates to the textarea
import { debounce } from 'throttle-debounce';
import { AppWindow } from '../../components';
// Utility functions from SAGE3
import { downloadFile } from '@sage3/frontend';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

// Styling for the placeholder text
import './styling.css';
import { MdRemove, MdAdd, MdFileDownload, MdOutlineBlock } from 'react-icons/md';
import { useParams } from 'react-router';
import { SAGEColors } from '@sage3/shared';

/**
 * NoteApp SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
function AppComponent(props: App): JSX.Element {
  // Get the data for this app from the props
  const s = props.data.state as AppState;

  // Update functions from the store
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const createApp = useAppStore((state) => state.create);
  const { user } = useUser();
  const { boardId, roomId } = useParams();
  const selectedAppId = useUIStore((state) => state.selectedAppId);

  const backgroundColor = useHexColor(s.color + '.300');

  const yours = user?._id === props._createdBy;
  const updatedByYou = user?._id === props._updatedBy;
  const selected = selectedAppId === props._id;

  // Keep a reference to the input element
  const textbox = useRef<HTMLTextAreaElement>(null);

  // Font size: this will be updated as the text or size of the sticky changes
  const [fontSize, setFontSize] = useState(s.fontSize);
  const [rows, setRows] = useState(5);

  // The text of the sticky for React
  const [note, setNote] = useState(s.text);

  // Update local value with value from the server
  useEffect(() => {
    if (!updatedByYou) {
      setNote(s.text);
    }
  }, [s.text, updatedByYou]);

  // Update local value with value from the server
  useEffect(() => {
    setFontSize(s.fontSize);
    // Adjust the size of the textarea
    if (textbox.current) {
      const numlines = Math.ceil(textbox.current.scrollHeight / s.fontSize);
      if (numlines > rows) {
        // change local number of rows
        setRows(numlines);
        // update size of the window
        update(props._id, { size: { width: props.data.size.width, height: numlines * s.fontSize, depth: props.data.size.depth } });
      }
    }
  }, [s.fontSize]);

  // Saving the text after 1sec of inactivity
  const debounceSave = debounce(100, (val) => {
    updateState(props._id, { text: val });
  });
  // Keep a copy of the function
  const debounceFunc = useRef(debounceSave);

  // callback for textarea change
  function handleTextChange(ev: React.ChangeEvent<HTMLTextAreaElement>) {
    const inputValue = ev.target.value;
    // Update the local value
    setNote(inputValue);
    // Update the text when not typing
    debounceFunc.current(inputValue);

    // Adjust the size of the textarea
    if (textbox.current) {
      const numlines = Math.ceil(textbox.current.scrollHeight / s.fontSize);
      if (numlines > rows) {
        // change local number of rows
        setRows(numlines);
        // update size of the window
        update(props._id, { size: { width: props.data.size.width, height: numlines * s.fontSize, depth: props.data.size.depth } });
      }
    }
  }

  // Key down handler: Tab creates another stickie
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!user) return;
    if (e.shiftKey && e.code === 'Tab') {
      // Create a new stickie
      createApp({
        title: user.data.name,
        roomId: roomId!,
        boardId: boardId!,
        position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
        size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Stickie',
        // keep the same color, like a clone operation except for the text
        state: { text: '', color: s.color, fontSize: s.fontSize, executeInfo: { executeFunc: '', params: {} } },
        raised: true,
      });
    }
  };

  // React component
  return (
    <AppWindow app={props}>
      <Box bgColor={backgroundColor} color="black" w={'100%'} h={'100%'} p={0}>
        <Textarea
          ref={textbox}
          resize={'none'}
          w="100%"
          h="100%"
          variant="outline"
          borderWidth="0px"
          p={4}
          style={{ resize: 'none' }}
          aria-label="Note text"
          placeholder="Type here..."
          fontFamily="Arial"
          focusBorderColor={s.color}
          overflow={fontSize !== 10 ? 'hidden' : 'auto'}
          fontSize={fontSize + 'px'}
          lineHeight="1em"
          value={note}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          readOnly={!yours} // Only the creator can edit
          zIndex={1}
        />
        {!yours && selected && (
          <Box position="absolute" right="1" bottom="0" transformOrigin="bottom right" zIndex={2}>
            <Tooltip label="Not your Stickie" shouldWrapChildren placement="top" hasArrow>
              <MdOutlineBlock color="red" fontSize="32px" />
            </Tooltip>
          </Box>
        )}
      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Update functions from the store
  const updateState = useAppStore((state) => state.updateState);
  // Access the list of users
  const users = useUsersStore((state) => state.users);
  const { user } = useUser();

  const yours = user?._id === props._createdBy;

  // Larger font size
  function handleIncreaseFont() {
    const fs = s.fontSize + 8;
    updateState(props._id, { fontSize: fs });
  }

  // Smaller font size
  function handleDecreaseFont() {
    const fs = s.fontSize - 8;
    updateState(props._id, { fontSize: fs });
  }

  // Download the stickie as a text file
  const downloadTxt = () => {
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    const content = `${s.text}`;
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with username and date
    const filename = 'stickie-' + dt + '.md';
    // Go for download
    downloadFile(txturl, filename);
  };

  // Download the stickie as a Mardown file
  const downloadMd = () => {
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    // Add whitespace at the end of the text to make it a paragraph
    const text = s.text.split('\n').join('  \n');
    const style = `<style type="text/css" rel="stylesheet">body { background-color: ${s.color}} * {color: black} }</style>`;
    const ownerName = users.find((el) => el._id === props._createdBy)?.data.name;
    const content = `# Stickie\n${dt}\n___\n${text}\n___\nCreated by ${ownerName} with SAGE3\n${style}`;
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with username and date
    const filename = 'stickie-' + dt + '.md';
    // Go for download
    downloadFile(txturl, filename);
  };

  const handleColorChange = (color: string) => {
    updateState(props._id, { color: color });
  };

  return (
    <>
      <HStack>
        {yours && (
          <>
            <ButtonGroup isAttached size="xs" colorScheme="teal">
              <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
                <Button
                  isDisabled={s.fontSize > 128}
                  onClick={() => handleIncreaseFont()}
                  _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
                >
                  <MdAdd />
                </Button>
              </Tooltip>

              <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
                <Button
                  isDisabled={s.fontSize <= 8}
                  onClick={() => handleDecreaseFont()}
                  _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
                >
                  <MdRemove />
                </Button>
              </Tooltip>
            </ButtonGroup>
            <ColorPicker onChange={handleColorChange} selectedColor={s.color as SAGEColors} size="xs" />
          </>
        )}

        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="top-start" hasArrow={true} label={'Download as Text'} openDelay={400}>
            <Button onClick={downloadTxt} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
              <MdFileDownload />
            </Button>
          </Tooltip>
          <Tooltip placement="top-start" hasArrow={true} label={'Download as Markdown'} openDelay={400}>
            <Button onClick={downloadMd} colorScheme="pink" _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
              <MdFileDownload />
            </Button>
          </Tooltip>
        </ButtonGroup>
      </HStack>
    </>
  );
}

export default { AppComponent, ToolbarComponent };

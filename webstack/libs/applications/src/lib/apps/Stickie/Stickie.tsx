/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Import the React library
import { useState, useRef, useEffect } from 'react';
import { Box, Button, ButtonGroup, Menu, MenuButton, MenuItem, MenuList, Textarea, Tooltip } from '@chakra-ui/react';

import { ColorPicker, useAppStore, useHexColor, useUIStore, useUser, useUsersStore } from '@sage3/frontend';
import { App } from '../../schema';
import { initialValues } from '@sage3/applications/initialValues';

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
import { MdRemove, MdAdd, MdFileDownload, MdLock, MdLockOpen, MdMenu } from 'react-icons/md';
import { useParams } from 'react-router';
import { SAGEColors } from '@sage3/shared';

// LLAMA2 API
//  - API: https://huggingface.github.io/text-generation-inference/
const LLAMA2_SERVER = 'https://compaasgold03.evl.uic.edu';
const LLAMA2_ENDPOINT = '/generate';
const LLAMA2_URL = LLAMA2_SERVER + LLAMA2_ENDPOINT;
const LLAMA2_TOKENS = 200;
const LLAMA2_SYSTEM_PROMPT = 'You are a helpful assistant that answer questions in short and concise manner.';

/**
 * NoteApp SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
function AppComponent(props: App): JSX.Element {
  // Get the data for this app from the props
  const s = props.data.state as AppState;

  const { boardId, roomId } = useParams();

  // Update functions from the store
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const createApp = useAppStore((state) => state.create);
  const { user } = useUser();
  const selectedApp = useUIStore((state) => state.selectedAppId);

  const backgroundColor = useHexColor(s.color + '.300');

  const yours = user?._id === props._createdBy;
  const updatedByYou = user?._id === props._updatedBy;
  const locked = s.lock;

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
        if (props.data.size.height !== numlines * s.fontSize) {
          update(props._id, { size: { width: props.data.size.width, height: numlines * s.fontSize, depth: props.data.size.depth } });
        }
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
    if (e.repeat) return;
    // if not selected, don't do anything
    if (props._id !== selectedApp) return;

    if (e.code === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
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
          state: { ...(initialValues['Stickie'] as AppState), text: '', color: s.color, fontSize: s.fontSize },
          raised: true,
          dragging: false,
        });
      }
    }
  };

  const unlock = () => {
    updateState(props._id, { lock: false });
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
          readOnly={locked} // Only the creator can edit
          zIndex={1}
          name={'stickie' + props._id}
          css={{
            // Balance the text, improve text layouts
            textWrap: "balance"
          }}
        />
        {locked && (
          <Box position="absolute" right="1" bottom="0" transformOrigin="bottom right" zIndex={2}>
            <Tooltip label={`Locked by ${yours ? 'you' : props.data.title}`} shouldWrapChildren placement="top" hasArrow>
              {yours ? (
                <MdLock color="red" fontSize="32px" onClick={unlock} style={{ cursor: 'pointer' }} />
              ) : (
                <MdLock color="red" fontSize="32px" />
              )}
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
  const createApp = useAppStore((state) => state.create);
  // Access the list of users
  const users = useUsersStore((state) => state.users);
  const { user } = useUser();
  const { boardId, roomId } = useParams();

  const yours = user?._id === props._createdBy;
  const locked = s.lock;

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

  const summarize = () => {
    // Test to tweak the system prompt
    const complete_request = `<s>[INST] <<SYS>> ${LLAMA2_SYSTEM_PROMPT} <</SYS>> Summarize this in one sentence: ${s.text} [/INST]`;
    // URL for the request
    const modelURL = LLAMA2_URL;
    // Build the body of the request
    const modelBody = {
      inputs: complete_request,
      parameters: { "max_new_tokens": LLAMA2_TOKENS },
    };
    // Post the request and handle server-sent events
    fetch(modelURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(modelBody)
    }).then((response) => response.json())
      .then((data) => {
        console.log('Got>', data);
        if (data.generated_text) {
          // Create a new stickie
          createApp({
            title: user?.data.name || 'Stickie',
            roomId: roomId!,
            boardId: boardId!,
            position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
            size: { width: props.data.size.width, height: props.data.size.height / 4, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Stickie',
            state: { ...(initialValues['Stickie'] as AppState), text: data.generated_text, color: 'purple', fontSize: s.fontSize },
            raised: true,
            dragging: false,
          });
        }
      });
  };

  const topics = () => {
    // Test to tweak the system prompt
    const complete_request = `<s>[INST] <<SYS>> ${LLAMA2_SYSTEM_PROMPT} <</SYS>> What are the main topics of this text, answer in Mardown format: ${s.text} [/INST]`;
    // URL for the request
    const modelURL = LLAMA2_URL;
    // Build the body of the request
    const modelBody = {
      inputs: complete_request,
      parameters: { "max_new_tokens": LLAMA2_TOKENS },
    };
    // Post the request and handle server-sent events
    fetch(modelURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(modelBody)
    }).then((response) => response.json())
      .then((data) => {
        console.log('Got>', data);
        if (data.generated_text) {
          // Create a new stickie
          createApp({
            title: user?.data.name || 'Stickie',
            roomId: roomId!,
            boardId: boardId!,
            position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
            size: { width: props.data.size.width, height: props.data.size.height / 4, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Stickie',
            state: { ...(initialValues['Stickie'] as AppState), text: data.generated_text, color: 'purple', fontSize: s.fontSize },
            raised: true,
            dragging: false,
          });
        }
      });
  };

  const newChat = () => {
    // Create a new stickie
    createApp({
      title: user?.data.name || 'Chat',
      roomId: roomId!,
      boardId: boardId!,
      position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
      size: { width: 600, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Chat',
      state: { ...(initialValues['Chat'] as AppState), context: s.text },
      raised: true,
      dragging: false,
    });
  };

  const handleColorChange = (color: string) => {
    updateState(props._id, { color: color });
  };

  const lockUnlock = () => {
    updateState(props._id, { lock: !locked });
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
          <Button isDisabled={s.fontSize > 128 || locked} onClick={() => handleIncreaseFont()}>
            <MdAdd />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
          <Button isDisabled={s.fontSize <= 8 || locked} onClick={() => handleDecreaseFont()}>
            <MdRemove />
          </Button>
        </Tooltip>
      </ButtonGroup>
      {yours && (
        <Tooltip placement="top-start" hasArrow={true} label={`${locked ? 'Unlock' : 'Lock'} Stickie`} openDelay={400}>
          <Button onClick={lockUnlock} colorScheme="teal" size="xs" mx={1}>
            {locked ? <MdLock /> : <MdLockOpen />}
          </Button>
        </Tooltip>
      )}
      <ColorPicker onChange={handleColorChange} selectedColor={s.color as SAGEColors} size="xs" disabled={locked} />

      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'Download as Text'} openDelay={400}>
          <Button onClick={downloadTxt}>
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Extra Actions */}
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr={1}>
        <Menu placement="top-start">
          <Tooltip hasArrow={true} label={'Actions'} openDelay={300}>
            <MenuButton as={Button} colorScheme="teal" aria-label="layout">
              <MdMenu />
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px" fontSize={"sm"}>
            <MenuItem icon={<MdFileDownload />} onClick={downloadMd}>
              Download as Markdown
            </MenuItem>
            <MenuItem icon={<MdFileDownload />} onClick={summarize}>
              Summarize in one sentence
            </MenuItem>
            <MenuItem icon={<MdFileDownload />} onClick={topics}>
              What are the main topics
            </MenuItem>
            <MenuItem icon={<MdFileDownload />} onClick={newChat}>
              Chat about this
            </MenuItem>
          </MenuList>
        </Menu>
      </ButtonGroup>

      {/* Remote Action in Python */}
      {/* <ButtonGroup isAttached size="xs" colorScheme="orange" mr={0}>
        <Menu placement="top-start">
          <Tooltip hasArrow={true} label={'Remote Actions'} openDelay={300}>
            <MenuButton as={Button} colorScheme="orange" aria-label="layout">
              <MdMenu />
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px" fontSize={"sm"}>
            <MenuItem icon={<MdTipsAndUpdates />} onClick={summarizeText}>
              Summary
            </MenuItem>
          </MenuList>
        </Menu>
      </ButtonGroup> */}
    </>
  );
}

export default { AppComponent, ToolbarComponent };

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Import the React library
import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import { Box, Button, ButtonGroup, Textarea, Tooltip, useColorModeValue, useToast, useDisclosure } from '@chakra-ui/react';
import { MdRemove, MdAdd, MdFileDownload, MdFileUpload, MdLock, MdLockOpen, MdStickyNote2 } from 'react-icons/md';

// Date manipulation (for filename)
import { format } from 'date-fns/format';

// SAGE3 store hooks and utility functions
import {
  ColorPicker,
  useAppStore,
  useHexColor,
  useUIStore,
  useUser,
  useUsersStore,
  downloadFile,
  useInsightStore,
  ConfirmValueModal,
  apiUrls,
  useYjs,
  serverTime,
  YjsRoomConnection,
} from '@sage3/frontend';
import { SAGEColors } from '@sage3/shared';
import { InsightSchema } from '@sage3/shared/types';

import { state as AppState } from './';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';

// Styling for the placeholder text
import './styling.css';

// Yjs Imports
import { TextAreaBinding } from 'y-textarea';
import { debounce } from 'throttle-debounce';

/**
 * NoteApp SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
function AppComponent(props: App): JSX.Element {
  // Get the data for this app from the props
  const s = props.data.state as AppState;

  const { user } = useUser();
  const { boardId, roomId } = useParams();
  // Update functions from the store
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const backgroundColor = useHexColor(s.color + '.300');
  const scrollbarColor = useHexColor(s.color + '.400');

  // Keep a reference to the input element
  const textbox = useRef<HTMLTextAreaElement>(null);
  // Font size: this will be updated as the text or size of the sticky changes
  const [fontSize, setFontSize] = useState(s.fontSize);

  // Use Yjs
  const { yApps } = useYjs();

  // Update local fontsize value with value from the server
  useEffect(() => {
    setFontSize(s.fontSize);
  }, [s.fontSize]);

  const connectToYjs = async (textArea: HTMLTextAreaElement, yRoom: YjsRoomConnection) => {
    const yText = yRoom.doc.getText(props._id);
    const provider = yRoom.provider;

    // Ensure we are always operating on the same line endings
    new TextAreaBinding(yText, textArea);
    const users = provider.awareness.getStates();
    const count = users.size;

    // Sync current ydoc with that is saved in the database
    const syncStateWithDatabase = () => {
      // Clear any existing lines
      yText.delete(0, yText.length);
      // Set the lines from the database
      yText.insert(0, s.text);
    };

    // If I am the only one here according to Yjs, then sync with database
    if (count == 1) {
      syncStateWithDatabase();
    } else if (count > 1 && props._createdBy === user?._id) {
      // There are other users here and I created this app.
      // Is this app less than 5 seconds old...this feels hacky
      const now = await serverTime();
      const created = props._createdAt;
      // Then we need to sync with database due to Yjs not being able to catch the initial state
      if (now.epoch - created < 5000) {
        // I created this
        syncStateWithDatabase();
      }
    }
  };

  useEffect(() => {
    if (textbox.current && yApps) {
      connectToYjs(textbox.current, yApps);
    }
  }, [textbox, yApps]);

  // Saving the text after 1sec of inactivity
  const debounceSave = debounce(1000, (val) => {
    updateState(props._id, { text: val });
  });
  // Keep a copy of the function
  const debounceFunc = useRef(debounceSave);

  // callback for textarea change
  function handleTextChange(ev: React.ChangeEvent<HTMLTextAreaElement>) {
    const inputValue = ev.target.value;
    // Update Remote state *** REMOVE FOR RIGHT NO FOR TESTING
    debounceFunc.current(inputValue);
  }

  // Key down handler: Tab creates another stickie
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!user) return;
    if (e.repeat) return;
    // if not selected, don't do anything

    if (e.code === 'Escape') {
      // Deselect the app
      setSelectedApp('');
      // Deselect the text area
      textbox.current?.blur();
      return;
    }
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
          state: { ...s, text: '' },
          raised: true,
          dragging: false,
          pinned: false,
        });
      }
    }
  };

  // React component
  return (
    <AppWindow app={props} hideBackgroundColor={backgroundColor} hideBordercolor={scrollbarColor} hideBackgroundIcon={MdStickyNote2}>
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
          focusBorderColor={backgroundColor}
          fontSize={fontSize + 'px'}
          lineHeight="1em"
          onInput={handleTextChange}
          onKeyDown={handleKeyDown}
          readOnly={s.lock}
          zIndex={1}
          name={'stickie' + props._id}
          whiteSpace={'pre-wrap'}
          css={{
            scrollPaddingBlock: '1em',
            // Balance the text, improve text layouts, pretty or balance
            textWrap: 'pretty',
            '&::-webkit-scrollbar': {
              background: `${backgroundColor}`,
              width: '24px',
              height: '2px',
              scrollbarGutter: 'stable',
            },
            '&::-webkit-scrollbar-thumb': {
              background: `${scrollbarColor}`,
              borderRadius: '8px',
            },
          }}
          // overflow={fontSize !== 10 ? 'hidden' : 'auto'}
          overflowY="scroll"
          overflowX="hidden"
        />
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
  // Room and board
  const { roomId } = useParams();
  // Save Confirmation  Modal
  const { isOpen: saveIsOpen, onOpen: saveOnOpen, onClose: saveOnClose } = useDisclosure();
  // Display some notifications
  const toast = useToast();

  const yours = user?._id === props._createdBy;
  const locked = s.lock;

  const fontSizeBackground = useColorModeValue('teal.500', 'teal.200');
  const fontSizeColor = useColorModeValue('white', 'black');

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
    const dt = format(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    const content = `${s.text}`;
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with username and date
    const filename = 'stickie-' + dt + '.txt';
    // Go for download
    downloadFile(txturl, filename);
  };

  // Download the stickie as a Mardown file
  const downloadMd = () => {
    // Current date
    const dt = format(new Date(), 'yyyy-MM-dd-HH:mm:ss');
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

  const handleSave = useCallback(
    (val: string) => {
      // save cell code in asset manager
      if (!val.endsWith('.md')) {
        val += '.md';
      }
      // Save the code in the asset manager
      if (roomId) {
        // Create a form to upload the file
        const fd = new FormData();
        const codefile = new File([new Blob([s.text])], val);
        fd.append('files', codefile);
        // Add fields to the upload form
        fd.append('room', roomId);
        // Upload with a POST request
        fetch(apiUrls.assets.upload, { method: 'POST', body: fd })
          .catch((error: Error) => {
            toast({
              title: 'Upload',
              description: 'Upload failed: ' + error.message,
              status: 'warning',
              duration: 4000,
              isClosable: true,
            });
          })
          .finally(() => {
            toast({
              title: 'Upload',
              description: 'Upload complete',
              status: 'info',
              duration: 4000,
              isClosable: true,
            });
          });
      }
    },
    [s.text, roomId]
  );

  const handleColorChange = (color: string) => {
    // Save the previous color
    const oldcolor = s.color;
    // Update the application state
    updateState(props._id, { color: color });
    // Update the tags with the new color
    updateTags(props._id, oldcolor + ':' + oldcolor, color + ':' + color);
  };

  const lockUnlock = () => {
    updateState(props._id, { lock: !locked });
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr="1">
        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
          <Button isDisabled={s.fontSize <= 8 || locked} onClick={() => handleDecreaseFont()}>
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Current Font Size'} openDelay={400}>
          <Box px={2} m={0} height={'24px'} lineHeight={'24px'} fontSize="12px" background={fontSizeBackground} color={fontSizeColor}>
            {s.fontSize}
          </Box>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
          <Button isDisabled={s.fontSize > 128 || locked} onClick={() => handleIncreaseFont()}>
            <MdAdd />
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
        <Tooltip placement="top-start" hasArrow={true} label={'Save in Asset Manager'} openDelay={400}>
          <Button onClick={saveOnOpen} _hover={{ opacity: 0.7 }} isDisabled={s.text.length === 0}>
            <MdFileUpload />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Download as Markdown'} openDelay={400}>
          <Button onClick={downloadMd}>
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Extra Actions */}
      {/* <ButtonGroup isAttached size="xs" colorScheme="teal" mr={1}>
        <Menu placement="top-start">
          <Tooltip hasArrow={true} label={'Actions'} openDelay={300}>
            <MenuButton as={Button} colorScheme="teal" aria-label="layout">
              <MdMenu />
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px" fontSize={'sm'}>
            <MenuItem icon={<MdFileDownload />} onClick={downloadMd}>
              Download as Markdown
            </MenuItem>
          </MenuList>
        </Menu>
      </ButtonGroup> */}

      {/* Modal for saving stickie in asset manager */}
      <ConfirmValueModal
        isOpen={saveIsOpen}
        onClose={saveOnClose}
        onConfirm={handleSave}
        title="Save Note in Asset Manager"
        message="Select a file name:"
        initiaValue={'stickie-' + format(new Date(), 'yyyy-MM-dd-HH:mm:ss') + '.md'}
        cancelText="Cancel"
        confirmText="Save"
        confirmColor="green"
      />

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

/**
 * Update the tags of an app: remove the old value, add the new one
 * @param appid
 * @param oldvalue
 * @param newvalue
 */
function updateTags(appid: string, oldvalue: string, newvalue: string) {
  const newset = getSet(appid, oldvalue, newvalue);
  // Update the collection
  useInsightStore.getState().update(appid, { labels: newset });
}

function getSet(appid: string, oldvalue: string, newvalue: string): string[] {
  // Update the insight labels: put the color as a tag
  const entries = useInsightStore.getState().insights;
  // Find the correct app entry
  const entry = entries.find((e) => e.data.app_id === appid);
  if (entry) {
    // Build a set to remove old color and add new one
    const set = new Set(entry.data.labels);
    set.delete(oldvalue);
    set.add(newvalue);
    // Update the collection
    return Array.from(set);
  }
  return [];
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  const updateStateBatch = useAppStore((state) => state.updateStateBatch);
  const updateInsightBatch = useInsightStore((state) => state.updateBatch);
  const { user } = useUser();

  const handleColorChange = (color: string) => {
    // Array of update to batch at once
    const ba: Array<{ id: string; updates: Partial<AppState> }> = [];
    const bi: Array<{ id: string; updates: Partial<InsightSchema> }> = [];
    // Iterate through all the selected apps
    props.apps.forEach((app) => {
      if (app.data.state.lock) return;
      bi.push({ id: app._id, updates: { labels: getSet(app._id, app.data.state.color, color) } });
      ba.push({ id: app._id, updates: { color: color } });
    });
    // Update all the apps at once
    updateStateBatch(ba);
    updateInsightBatch(bi);
  };

  const handleIncreaseFont = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.lock) return;
      const size = app.data.state.fontSize + 8;
      if (size > 128) return;
      ps.push({ id: app._id, updates: { fontSize: size } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleDecreaseFont = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.lock) return;
      const size = app.data.state.fontSize - 8;
      if (size <= 8) return;
      ps.push({ id: app._id, updates: { fontSize: size } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleSetFont = () => {
    const min = Math.min(...props.apps.map((app) => app.data.state.fontSize));
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.lock) return;
      ps.push({ id: app._id, updates: { fontSize: min } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleLock = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app._createdBy !== user?._id) return;
      ps.push({ id: app._id, updates: { lock: true } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleUnlock = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app._createdBy !== user?._id) return;
      ps.push({ id: app._id, updates: { lock: false } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
          <Button onClick={() => handleDecreaseFont()}>
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Set Font Size'} openDelay={400}>
          <Button onClick={() => handleSetFont()}>{Math.min(...props.apps.map((app) => app.data.state.fontSize))}</Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
          <Button onClick={() => handleIncreaseFont()}>
            <MdAdd />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'Lock Stickies'} openDelay={400}>
          <Button onClick={() => handleLock()}>
            <MdLock />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Unlock Stickies'} openDelay={400}>
          <Button onClick={() => handleUnlock()}>
            <MdLockOpen />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ColorPicker
        onChange={handleColorChange}
        selectedColor={props.apps[0].data.state.color as SAGEColors}
        size="xs"
        style={{ marginRight: 4 }}
      />
    </>
  );
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

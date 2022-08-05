/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Import the React library
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, ButtonGroup, HStack, Textarea, Tooltip } from '@chakra-ui/react';

import { useAppStore, useUser } from '@sage3/frontend';
import { App } from '../../schema';

import { state as AppState } from './';

// Debounce updates to the textarea
import { debounce } from 'throttle-debounce';
import { AppWindow } from '../../components';

// Styling for the placeholder text
import './styling.css';
import { MdRemove, MdAdd } from 'react-icons/md';

const colors = ['#FC8181', '#F6AD55', '#F6E05E', '#68D391', '#4FD1C5', '#63b3ed', '#B794F4'];

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
  const location = useLocation();
  const locationState = location.state as {
    boardId: string;
    roomId: string;
  };

  // Keep a reference to the input element
  const textbox = useRef<HTMLTextAreaElement>(null);

  // Font size: this will be updated as the text or size of the sticky changes
  const [fontSize, setFontSize] = useState(s.fontSize);
  const [rows, setRows] = useState(5);

  // The text of the sticky for React
  const [note, setNote] = useState(s.text);

  // Update local value with value from the server
  useEffect(() => {
    setNote(s.text);
  }, [s.text]);
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
  const debounceSave = debounce(1000, (val) => {
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
        name: 'Stickie',
        description: 'Stckie>',
        roomId: locationState.roomId,
        boardId: locationState.boardId,
        position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
        size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Stickie',
        state: { text: '', color: s.color, fontSize: s.fontSize },
        ownerId: user._id,
        minimized: false,
        raised: true,
      });
    }
  };

  // React component
  return (
    <AppWindow app={props}>
      <Box bgColor={s.color} color="black" w={'100%'} h={'100%'} p={0}>
        <Textarea
          ref={textbox}
          resize={'none'}
          w="100%"
          h={props.data.size.height - 24}
          variant="outline"
          borderWidth="0px"
          p={4}
          borderRadius="0"
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
        />
      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Update functions from the store
  const updateState = useAppStore((state) => state.updateState);

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

  return (
    <>
      <HStack>
        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="bottom" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
            <Button mx={1} isDisabled={s.fontSize > 128} onClick={() => handleIncreaseFont()}>
              <MdAdd />
            </Button>
          </Tooltip>

          <Tooltip placement="bottom" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
            <Button mx={1} isDisabled={s.fontSize <= 8} onClick={() => handleDecreaseFont()}>
              <MdRemove />
            </Button>
          </Tooltip>
        </ButtonGroup >

        <ButtonGroup isAttached size="xs" colorScheme="teal">
          {/* Colors */}
          {colors.map((color) => {
            return (
              <Button mx={0.5}
                key={color}
                value={color}
                bgColor={color}
                _hover={{ background: color, opacity: 0.7, transform: 'scaleY(1.3)' }}
                _active={{ background: color, opacity: 0.9 }}
                size="xs"
                onClick={() => updateState(props._id, { color: color })}
              > </Button>
            );
          })}
        </ButtonGroup>
      </HStack>
    </>
  );
}

export default { AppComponent, ToolbarComponent };

/*
  // Main effect for styling the text
  useEffect(() => {

    // using canvas to calculate width of text
    const tempCanvas = document.createElement('canvas');
    const context = tempCanvas.getContext('2d');

    // Make the font size adjust to the size of the box and the content of the text
    const calcFontSize = (inputText: string) => {
      let currentSize = 5;
      let bestSize = 10;
      const sizeIncrement = 1;
      const minSize = 10;
      let offset = 0;
      if (textbox && textbox.current && context) {
        const lines = inputText.split('\n');
        // we will start at the maximal possible size and lower it
        // till we find a size that fits inside the textbox bounds

        const defaultFontSize = 16;
        currentSize = Math.floor((props.size.height - 2 * defaultFontSize) / (1.2 * lines.length));
        bestSize = Math.max(minSize, currentSize);

        while (currentSize >= minSize) {
          const boxClientWidth = props.size.width - 2 * defaultFontSize;
          const boxClientHeight = props.size.height - 2 * defaultFontSize;
          const maxLines = Math.floor(boxClientHeight / (1.2 * currentSize));
          let estimatedLines = 0;
          context.font = currentSize + 'px Arial';

          for (const line of lines) {
            estimatedLines++;
            offset = 0;
            const words = line.split(' '); // because we parse by space, lines with many extra spaces still mess up the calculation
            let currentPhrase = '';
            for (const word of words) {
              currentPhrase += ' ' + word;
              // currentPhrase +=  word;
              if (context.measureText(currentPhrase).width + offset > boxClientWidth) {
                const jumpLines = Math.floor((context.measureText(currentPhrase).width + offset) / boxClientWidth);
                estimatedLines = estimatedLines + jumpLines;
                offset = context.measureText(currentPhrase).width + offset - jumpLines * boxClientWidth;
                currentPhrase = '';
              }
            }
          }
          bestSize = Math.max(minSize, currentSize);
          if (estimatedLines <= maxLines) {
            return bestSize + 'px';
          }
          currentSize -= sizeIncrement;
        }
        console.log('Best size: ', bestSize);
        return bestSize + 'px';
      }
      console.log('Default: 1em');
      return '1em';
    };

    if (note === '') {
      setFontSize(calcFontSize('Type here...'));
    } else {
      const size = calcFontSize(note);
      setFontSize(size);
    }
 }, [s.color, note, props.size.width, props.size.height]);

*/

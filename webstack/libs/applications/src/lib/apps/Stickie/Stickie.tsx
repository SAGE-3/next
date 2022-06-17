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
import { Box, Textarea } from '@chakra-ui/react';

import { useAppStore } from '@sage3/frontend';
import { AppSchema } from '../../schema';

import { state as AppState } from './';

// Debounce updates to the textarea
import { debounce } from 'throttle-debounce';
import { AppWindow } from '../../components';

// Styling for the placeholder text
import './styling.css';

const colors = ['#FC8181', '#F6AD55', '#F6E05E', '#68D391', '#4FD1C5', '#63b3ed', '#B794F4'];

/**
 * NoteApp SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
function Stickie(props: AppSchema): JSX.Element {
  // Get the data for this app from the props
  const s = props.state as AppState;
  // Update functions from the store
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const createApp = useAppStore((state) => state.create);
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
  useEffect(() => { setNote(s.text); }, [s.text]);


  // Saving the text after 1sec of inactivity
  const debounceSave = debounce(1000, (val) => {
    updateState(props.id, { text: val });
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

    if (textbox.current) {
      const numlines = Math.ceil(textbox.current.scrollHeight / s.fontSize);
      if (numlines !== rows) {
        // change local number of rows
        setRows(numlines);
        // update size of the window
        update(props.id, { size: { width: props.size.width, height: numlines * s.fontSize, depth: props.size.depth } });
      }
    }
  }

  // Key down handler: Tab creates another stickie
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.shiftKey && e.code === 'Tab') {
      // Create a new stickie
      createApp(
        'Stickie',
        "Description",
        locationState.roomId,
        locationState.boardId,
        { x: props.position.x + props.size.width + 20, y: props.position.y, z: 0 },
        { width: props.size.width, height: props.size.height, depth: 0 },
        { x: 0, y: 0, z: 0 },
        false,
        'Stickie',
        { text: '', color: s.color, fontSize: s.fontSize }
      );
    }
  };

  // React component
  return (
    <AppWindow app={props}>
      <Box bgColor={s.color} color="black" w={props.size.width} h={props.size.height} p={0}>
        <Textarea
          ref={textbox}
          resize={'none'}
          w="100%"
          h={props.size.height - 24}
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

export default Stickie;

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
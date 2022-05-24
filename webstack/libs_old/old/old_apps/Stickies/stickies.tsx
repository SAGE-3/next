/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: stickies
 * created by: Nurit Kirshenbaum
 */

// Import the React library
import React from 'react';
import { useRef, useEffect, useState } from 'react';
// UI elements
import { Box, Textarea } from '@chakra-ui/react';

// Import the props definition for this application
import { stickiesProps, StickyType } from './metadata';

// State management functions from SAGE3
import { useSageStateAtom } from '@sage3/frontend/smart-data/hooks';

// import { useUser } from '@sage3/frontend/services';
import { useAction } from '@sage3/frontend/services';

// Throttling a function
import { throttle } from 'throttle-debounce';

// Styling for the placeholder text
import './styling.css';

export const Appsstickies = (props: stickiesProps): JSX.Element => {
  // Data management
  const stickyValue = useSageStateAtom<StickyType>(props.state.value);
  // The text of the sticky for React
  const [text, setText] = useState(stickyValue.data.text);

  // Handle to create applications
  const { act } = useAction();

  // Key down handler: Tab creates another stickie
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.shiftKey && e.code === 'Tab') {
      // get current position
      const pos = props.position;
      // shift right
      pos.x += pos.width + 20;
      act({
        type: 'create',
        appName: 'stickies',
        id: '',
        position: pos,
        // empty text, same color
        optionalData: { value: { text: '', color: stickyValue.data.color } },
      });
    }
  };

  // Saving the board at most once every 2sec.
  const throttleSave = throttle(2 * 1000, false, (val) => {
    stickyValue.setData((prevState) => {
      return { ...prevState, ...{ text: val } };
    });
  });
  // Keep a copy of the function
  const throttleFunc = useRef(throttleSave);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = e.target.value;
    // Set the React value right away
    setText(inputValue);
    // Call to update the SAGE3 state in throttled way
    throttleFunc.current(inputValue);
  };

  // Update local value from the server
  useEffect(() => {
    setText(stickyValue.data.text);
  }, [stickyValue.data.text]);

  // Keep a reference to the input element
  const textbox = useRef<HTMLTextAreaElement>(null);
  // Font size: this will be updated as the text or size of the sticky changes
  const [fontSize, setFontSize] = useState('10px');

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
        currentSize = Math.floor((props.position.height - 2 * defaultFontSize) / (1.2 * lines.length));
        bestSize = Math.max(minSize, currentSize);

        while (currentSize >= minSize) {
          const boxClientWidth = props.position.width - 2 * defaultFontSize;
          const boxClientHeight = props.position.height - 2 * defaultFontSize;
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
                offset = context.measureText(currentPhrase).width + offset - jumpLines * boxClientWidth; //
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
        return bestSize + 'px';
      }
      return '1em';
    };

    if (text === '') {
      setFontSize(calcFontSize('Type here...'));
    } else {
      const size = calcFontSize(text);
      setFontSize(size);
    }
  }, [stickyValue.data.color, text, props.position.width, props.position.height]);

  return (
    <Box bgColor={stickyValue.data.color} color="black" w="100%" h="100%" fontSize="6xl" p={0}>
      <Textarea
        ref={textbox}
        w="100%"
        h="100%"
        variant="outline"
        borderWidth="0px"
        p={4}
        borderRadius="0"
        style={{ resize: 'none' }}
        aria-label="Note text"
        placeholder="Type here..."
        fontFamily="Arial"
        focusBorderColor={stickyValue.data.color}
        overflow={fontSize !== '10px' ? 'hidden' : 'auto'}
        fontSize={fontSize}
        lineHeight="1em"
        value={text}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
    </Box>
  );
};

export default Appsstickies;

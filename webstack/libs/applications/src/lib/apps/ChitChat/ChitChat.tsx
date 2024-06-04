/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useRef, useState } from 'react';
import { Flex, Box, Input, InputGroup, InputRightElement, useColorModeValue, useToast } from '@chakra-ui/react';

import { MdSend } from 'react-icons/md';

// Date management
import { format } from 'date-fns/format';

import { useAppStore, useHexColor, AiAPI, useUser } from '@sage3/frontend';
import { genId } from '@sage3/shared';

import { state as AppState } from './index';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';


/* App component for ChitChat */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();

  // Colors for Dark theme and light theme
  const bgColor = useColorModeValue('gray.200', 'gray.800');
  const sc = useColorModeValue('gray.400', 'gray.200');
  const scrollColor = useHexColor(sc);
  const textColor = useColorModeValue('gray.700', 'gray.100');

  // Input text for query
  const [input, setInput] = useState<string>('');
  // Element to set the focus to when opening the dialog
  const inputRef = useRef<HTMLInputElement>(null);

  const chatBox = useRef<null | HTMLDivElement>(null);

  // Display some notifications
  const toast = useToast();

  const newMessage = async (new_input: string) => {
    if (!user) return;
    console.log('Message> sending', new_input);
  };

  const sendMessage = async () => {
    await newMessage(input.trim());
    setInput('');
  };

  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  // Input text for query
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  return (
    <AppWindow app={props}>
      <Flex gap={2} p={2} minHeight={'max-content'} direction={'column'} h="100%" w="100%">
        <Box
          flex={1}
          bg={bgColor}
          borderRadius={'md'}
          overflowY="scroll"
          ref={chatBox}
          css={{
            '&::-webkit-scrollbar': {
              width: '12px',
            },
            '&::-webkit-scrollbar-track': {
              '-webkit-box-shadow': 'inset 0 0 6px rgba(0,0,0,0.00)',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: `${scrollColor}`,
              borderRadius: '6px',
              outline: `3px solid ${bgColor}`,
            },
          }}
        >
          {/* Messages */}
        </Box>

        <InputGroup bg={'blackAlpha.100'}>
          <Input
            placeholder={"Query"}
            size="md"
            variant="outline"
            _placeholder={{ color: 'inherit' }}
            onChange={handleChange}
            onKeyDown={onSubmit}
            value={input}
            ref={inputRef}
          />
          <InputRightElement onClick={sendMessage}>
            <MdSend color="green.500" />
          </InputRightElement>
        </InputGroup>
      </Flex>
    </AppWindow>
  );
}

/* App toolbar component for the app ChitChat */
function ToolbarComponent(props: App) {
  return null;
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

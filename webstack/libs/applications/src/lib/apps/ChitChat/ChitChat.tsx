/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useRef, useState } from 'react';
import { Flex, Box, Input, InputGroup, InputRightElement, useColorModeValue, useToast } from '@chakra-ui/react';
import { MdSend } from 'react-icons/md';

import { useAppStore, useHexColor, AiAPI, useUser } from '@sage3/frontend';
import { AgentQueryType, genId } from '@sage3/shared';

import { state as AppState } from './index';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';
import { useParams } from 'react-router';


/* App component for ChitChat */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();

  // Colors for Dark theme and light theme
  const myColor = useHexColor(user?.data.color || 'blue');
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

  const { roomId, boardId } = useParams();

  const newMessage = async (new_input: string) => {
    if (!user) return;
    if (!roomId) return;
    if (!boardId) return;
    const id = genId();
    const pos = [props.data.position.x + props.data.size.width + 20, props.data.position.y];
    const question: AgentQueryType = { ctx: { prompt: s.context.prompt || '', pos, roomId, boardId }, id: id, user: user._id, q: new_input };
    const response = await AiAPI.langchain.ask(question);
    if (response.success) {
      updateState(props._id, { answer: { response: response.r } });
    } else {
      toast({
        title: 'Error',
        description: 'Error sending query to the agent. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    updateState(props._id, { question: { prompt: text }, answer: { response: '' } });
    setInput('');
    await newMessage(text);
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

  useEffect(() => {
    async function fetchStatus() {
      const response = await AiAPI.langchain.status();
      console.log('Agent Status>', response);
    }
    fetchStatus();

    if (inputRef.current) {
      inputRef.current.focus();
    }

  }, [inputRef]);

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
          <Box display={'flex'} justifyContent={'right'}>
            <Box
              color="white"
              rounded={'md'}
              boxShadow="md"
              fontFamily="arial"
              textAlign={'right'}
              bg={myColor}
              p={1}
              m={3}
              maxWidth="70%"
              userSelect={'none'}
            >
              {s.question.prompt}
            </Box>
          </Box>

          <Box display={'flex'} justifyContent={'left'}>
            <Box
              color="black"
              rounded={'md'}
              boxShadow="md"
              fontFamily="arial"
              textAlign={'left'}
              bg={textColor}
              p={1}
              m={3}
              maxWidth="70%"
              userSelect={'none'}
            >
              {s.answer.response}
            </Box>
          </Box>
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

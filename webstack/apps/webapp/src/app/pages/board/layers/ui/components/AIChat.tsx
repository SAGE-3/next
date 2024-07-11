/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router';

import { Box, useColorModeValue, Flex, Input, InputGroup, InputRightElement, useToast } from '@chakra-ui/react';

import { MdSend } from 'react-icons/md';

import { useUIStore, AiAPI, useHexColor, useUser } from '@sage3/frontend';
import { AgentQueryType, genId } from '@sage3/shared';


export function AIChat() {
  const { roomId, boardId } = useParams();
  const { user } = useUser();

  // Colors for Dark theme and light theme
  const myColor = useHexColor(user?.data.color || 'blue');
  const bgColor = useColorModeValue('gray.200', 'gray.800');
  const sc = useColorModeValue('gray.400', 'gray.200');
  const scrollColor = useHexColor(sc);
  const textColor = useColorModeValue('gray.500', 'gray.100');
  // Stores
  const scale = useUIStore((state) => state.scale);
  const boardPosition = useUIStore((state) => state.boardPosition);

  // Input text for query
  const [input, setInput] = useState<string>('');
  // Element to set the focus to when opening the dialog
  const inputRef = useRef<HTMLInputElement>(null);
  const chatBox = useRef<null | HTMLDivElement>(null);
  // Context of the chat
  const [context, setContext] = useState('');
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [position, setPosition] = useState([0, 0]);
  // Display some notifications
  const toast = useToast();

  const newMessage = async (new_input: string) => {
    if (!user) return;
    if (!roomId) return;
    if (!boardId) return;
    // Generate a unique id for the query
    const id = genId();
    // Build the query
    const question: AgentQueryType = { ctx: { prompt: context || '', pos: position, roomId, boardId }, id: id, user: user._id, q: new_input };
    // Invoke the agent
    const response = await AiAPI.langchain.ask(question);
    if (response.success) {
      // Store the agent's response
      setResponse(response.r);
      // Increase the position
      setPosition([position[0] + 400 + 20, position[1]]);
    } else {
      toast({
        title: 'Error',
        description: 'Error sending query to the agent. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }

    console.log('New Message>', new_input);
  };

  const sendMessage = async () => {
    const text = input.trim();
    console.log('Send Message>', text);
    setInput('');
    setResponse('');
    setQuestion(text);
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
      const response = true;
      console.log('Agent Status>', response);
    }
    fetchStatus();

    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Store initial position
    const x = Math.floor(-boardPosition.x + 50);
    const y = Math.floor(-boardPosition.y + 140);
    setPosition([x, y]);
  }, [inputRef]);


  return (
    <Flex gap={2} p={2} minHeight={'max-content'} direction={'column'} h="400px" w="100%">
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
          {question && <Box
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
            {question}
          </Box>}
        </Box>

        <Box display={'flex'} justifyContent={'left'}>
          {response && <Box
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
            {response}
          </Box>}
        </Box>
      </Box>

      <InputGroup bg={'blackAlpha.100'}>
        <Input
          placeholder={"Ask SAGE Intelligence"}
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
  );
}
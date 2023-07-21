/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, Fragment, useEffect } from 'react';
import { useToast, IconButton, Box, Text, Flex, useColorModeValue, Input, Tooltip, InputGroup, InputRightElement, HStack } from '@chakra-ui/react';
import { MdSend, MdExpandCircleDown, MdStopCircle } from 'react-icons/md';
import { fetchEventSource } from '@microsoft/fetch-event-source';

import { useAppStore, useHexColor, useUser, serverTime } from '@sage3/frontend';
import { genId } from '@sage3/shared';


import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

// const acknowledgments = [
//   "Thank you for your question!",
//   "Great question!",
//   "That's an interesting question!",
//   "I appreciate your curiosity!",
//   "Thanks for asking!",
//   "You've got my attention!",
//   "Wonderful question!",
//   "I'm glad you asked that!",
//   "Good question!",
//   "I love your inquisitiveness!"
// ];

/* App component for Chat */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();

  // Colors for Dark theme and light theme
  const myColor = useHexColor(user?.data.color || 'blue');
  const geppettoColor = useHexColor('purple');
  const geppettoTypingColor = useHexColor('orange');
  const otherUserColor = useHexColor('gray');
  const bgColor = useColorModeValue('gray.200', 'gray.800');
  const sc = useColorModeValue('gray.400', 'gray.200');
  const scrollColor = useHexColor(sc);
  const textColor = useColorModeValue('gray.700', 'gray.100');

  // Input text for query
  const [input, setInput] = useState<string>('');
  const [streamText, setStreamText] = useState<string>('');
  // Element to set the focus to when opening the dialog
  const inputRef = useRef<HTMLInputElement>(null);
  // Processing
  const [processing, setProcessing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [newMessages, setNewMessages] = useState(false);

  const chatBox = useRef<null | HTMLDivElement>(null);
  const ctrlRef = useRef<null | AbortController>(null);

  // Display some notifications
  const toast = useToast();

  // Sort messages by creation date to display in order
  const sortedMessages = s.messages ? s.messages.sort((a, b) => a.creationDate - b.creationDate) : [];

  // Input text for query
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      send();
    }
  };
  const send = () => {
    newMessage();
    setInput('');
  };

  const newMessage = async () => {
    if (!user) return;
    setProcessing(true);
    // Get server time
    const now = await serverTime();
    // Is it a question to Geppetto?
    const isQuestion = input.startsWith('@G');
    // Add messages
    const initialAnswer = {
      id: genId(),
      userId: user._id,
      creationId: '',
      creationDate: now.epoch,
      userName: user?.data.name,
      query: input,
      response: isQuestion ? 'Working on it...' : '',
    };
    updateState(props._id, {
      ...s, messages: [...s.messages, initialAnswer],
    });
    if (isQuestion) {
      // Remove the @G
      const request = input.slice(2);
      const ctrl = new AbortController();
      // Save the controller for later use
      ctrlRef.current = ctrl;
      let tempText = '';
      setStreamText(tempText);
      // API: https://huggingface.github.io/text-generation-inference/
      fetchEventSource('http://131.193.183.239:3000/generate_stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: request,
          parameters: { "max_new_tokens": 300 },
        }),
        signal: ctrl.signal,
        onmessage(msg) {
          // if the server emits an error message, throw an exception
          // so it gets handled by the onerror callback below:
          if (msg.event === 'FatalError') {
            console.log('Error>', msg.data);
            setStreamText('');
            ctrlRef.current = null;
          } else {
            const message = JSON.parse(msg.data);
            if (message.generated_text) {
              // Clear the stream text
              setStreamText('');
              ctrlRef.current = null;
              // Add messages
              updateState(props._id, {
                ...s,
                messages: [
                  ...s.messages, initialAnswer,
                  {
                    id: genId(),
                    userId: user._id,
                    creationId: '',
                    creationDate: now.epoch + 1,
                    userName: 'Geppetto',
                    query: '',
                    response: message.generated_text,
                  },
                ],
              });
            } else {
              if (message.token.text) {
                tempText += message.token.text;
                setStreamText(tempText);
                goToBottom();
              }
            }
          }
        },
      });
    }


    setTimeout(() => {
      // Scroll to bottom of chat box smoothly
      goToBottom();
    }, 100);
    setProcessing(false);
  };

  const goToBottom = () => {
    // Scroll to bottom of chat box smoothly
    chatBox.current?.scrollTo({
      top: chatBox.current?.scrollHeight, behavior: "smooth",
    });
  };

  const stopGepetto = async () => {
    if (ctrlRef.current && user) {
      console.log('Geppetto> stopping');
      ctrlRef.current.abort();
      ctrlRef.current = null;
      if (streamText) {
        // Get server time
        const now = await serverTime();
        // Add the current text as a message
        updateState(props._id, {
          ...s,
          messages: [
            ...s.messages,
            {
              id: genId(),
              userId: user._id,
              creationId: '',
              creationDate: now.epoch,
              userName: 'Geppetto',
              query: '',
              response: streamText + '...(interrupted)',
            },
          ],
        });
      }
      setStreamText('');
    }
  };

  useEffect(() => {
    // Scroll to bottom of chat box immediately
    chatBox.current?.scrollTo({
      top: chatBox.current?.scrollHeight, behavior: "instant",
    });
    chatBox.current?.addEventListener('scrollend', (e) => {
      if (chatBox.current && chatBox.current.scrollTop) {
        const test = chatBox.current.scrollHeight - chatBox.current.scrollTop - chatBox.current.clientHeight;
        if (test === 0) {
          setScrolled(false);
          setNewMessages(false);
        } else {
          setScrolled(true);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!processing && !scrolled) {
      // Scroll to bottom of chat box smoothly
      goToBottom();
    }
    if (scrolled) setNewMessages(true);
  }, [s.messages]);

  return (
    <AppWindow app={props}>
      <Flex gap={2} p={2} minHeight={"max-content"} direction={"column"} h="100%" w="100%">
        {/* Display Messages */}
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
          {sortedMessages.map((message, index) => {
            const isMe = user?._id == message.userId;
            const time = getDateString(message.creationDate);
            return (
              <Fragment key={index}>
                {/* Start of User Messages */}
                {message.query.length ? (
                  <Box position="relative" my={1}>
                    {isMe ?
                      <Box top="-15px" right={'15px'} position={'absolute'} textAlign={"right"}>
                        <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                          Me
                        </Text>
                      </Box>
                      :
                      <Box top="-15px" left={'15px'} position={'absolute'} textAlign={"right"}>
                        <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                          {message.userName}
                        </Text>
                      </Box>
                    }

                    <Box display={'flex'} justifyContent={isMe ? "right" : "left"}>
                      <Tooltip whiteSpace={'nowrap'} textOverflow="ellipsis" fontSize={"xs"}
                        placement="top" hasArrow={true} label={time} openDelay={400}>
                        <Box
                          color="white"
                          rounded={'md'}
                          boxShadow="md"
                          fontFamily="arial"
                          textAlign={isMe ? "right" : "left"}
                          bg={isMe ? myColor : otherUserColor}
                          p={1} m={3}
                          maxWidth="70%"
                          userSelect={"none"}
                          onDoubleClick={() => {
                            // Copy into clipboard
                            navigator.clipboard.writeText(message.query);
                            // Notify the user
                            toast({
                              title: 'Success',
                              description: `Content Copied to Clipboard`,
                              duration: 3000,
                              isClosable: true,
                              status: 'success',
                            });

                          }}
                        >
                          {message.query}
                        </Box>
                      </Tooltip>
                    </Box>
                  </Box>
                ) : null}

                {/* Start of Geppetto Messages */}
                {message.response.length ?
                  <Box position="relative" my={1} maxWidth={'70%'}>
                    <Box top="0" left={'15px'} position={'absolute'} textAlign="left">
                      <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                        Geppetto
                      </Text>
                    </Box>

                    <Box display={'flex'} justifyContent="left" position={"relative"} top={"15px"} mb={"15px"}>
                      <Tooltip whiteSpace={'nowrap'} textOverflow="ellipsis" fontSize={"xs"}
                        placement="top" hasArrow={true} label={time} openDelay={400}>
                        <Box boxShadow="md" color="white" rounded={'md'} textAlign={'left'} bg={geppettoColor} p={1} m={3} fontFamily="arial">
                          {message.response}
                        </Box>
                      </Tooltip>
                    </Box>
                  </Box>
                  : null}
              </Fragment>
            );
          })}

          {/* In progress Geppetto Messages */}
          {streamText &&
            <Box position="relative" my={1} maxWidth={'70%'}>
              <Box top="0" left={'15px'} position={'absolute'} textAlign="left">
                <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                  Geppetto is typing...
                </Text>
              </Box>

              <Box display={'flex'} justifyContent="left" position={"relative"} top={"15px"} mb={"15px"}>
                <Box boxShadow="md" color="white" rounded={'md'} textAlign={'left'} bg={geppettoTypingColor} p={1} m={3} fontFamily="arial">
                  {streamText}
                </Box>
              </Box>
            </Box>
          }

        </Box>
        <HStack>
          <Tooltip fontSize={"xs"}
            placement="top" hasArrow={true} label={newMessages ? "New Messages" : "No New Messages"} openDelay={400}>
            <IconButton aria-label='Messages' size={"xs"}
              p={0} m={0} colorScheme={newMessages ? "green" : "blue"} variant='ghost'
              icon={<MdExpandCircleDown size={"xs"} />}
              isDisabled={!newMessages}
              onClick={goToBottom}
              width="50%"
            />
          </Tooltip>
          <Tooltip fontSize={"xs"}
            placement="top" hasArrow={true} label={"Stop Geppetto"} openDelay={400}>
            <IconButton aria-label='Messages' size={"xs"}
              p={0} m={0} colorScheme={"blue"} variant='ghost'
              icon={<MdStopCircle size={"xs"} />}
              onClick={stopGepetto}
              width="50%"
            />
          </Tooltip>
        </HStack>
        <InputGroup bg={"blackAlpha.100"}>
          <Input placeholder='Chat or @G Ask me anyting' size='md' variant='outline' _placeholder={{ color: 'inherit' }}
            onChange={handleChange}
            onKeyDown={onSubmit}
            value={input}
            ref={inputRef}
          />
          <InputRightElement onClick={send}>
            <MdSend color='green.500' />
          </InputRightElement>
        </InputGroup>
      </Flex>
    </AppWindow >
  );
}

/* App toolbar component for the app Chat */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
    </>
  );
}



function getDateString(epoch: number): string {
  const date = new Date(epoch).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  const time = new Date(epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} - ${time}`;
}


export default { AppComponent, ToolbarComponent };

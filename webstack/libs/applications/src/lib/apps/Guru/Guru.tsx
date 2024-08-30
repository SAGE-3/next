/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, Fragment, useEffect } from 'react';
import {
  ButtonGroup,
  Button,
  useToast,
  IconButton,
  Box,
  Text,
  Flex,
  useColorModeValue,
  Input,
  Tooltip,
  InputGroup,
  InputRightElement,
  HStack,
  Divider,
  Center,
  AbsoluteCenter,
} from '@chakra-ui/react';
import { MdSend, MdExpandCircleDown, MdStopCircle, MdChangeCircle, MdFileDownload, MdChat } from 'react-icons/md';

// Date management
import { formatDistance, set } from 'date-fns';
import { format } from 'date-fns/format';
// Markdown
import Markdown from 'markdown-to-jsx';

import { useAppStore, useHexColor, useUser, serverTime, downloadFile, useUsersStore, AiAPI } from '@sage3/frontend';
import { genId } from '@sage3/shared';

import { App } from '../../schema';
import { state as AppState, init as initialState } from './index';
import { AppWindow } from '../../components';

// AI model information from the backend
interface modelInfo {
  name: string;
  model: string;
  maxTokens: number;
}

/* App component for Chat */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const { user } = useUser();

  // Colors for Dark theme and light theme
  const myColor = useHexColor(user?.data.color || 'blue');
  const sageColor = useHexColor('purple');
  const aiTypingColor = useHexColor('orange');
  const otherUserColor = useHexColor('gray');
  const bgColor = useColorModeValue('gray.200', 'gray.800');
  const fgColor = useColorModeValue('gray.800', 'gray.200');
  const sc = useColorModeValue('gray.400', 'gray.200');
  const scrollColor = useHexColor(sc);
  const textColor = useColorModeValue('gray.700', 'gray.100');
  // App state management
  const updateState = useAppStore((state) => state.updateState);
  // Get presences of users
  const users = useUsersStore((state) => state.users);
  // Online Models
  // const [onlineModels, setOnlineModels] = useState<modelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<modelInfo>();

  // Input text for query
  const [input, setInput] = useState<string>('');
  const [streamText, setStreamText] = useState<string>('');
  // Element to set the focus to when opening the dialog
  const inputRef = useRef<HTMLInputElement>(null);
  // Processing
  const [processing, setProcessing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [newMessages, setNewMessages] = useState(false);

  const [previousQuestion, setPreviousQuestion] = useState<string>(s.previousQ);
  const [previousAnswer, setPreviousAnswer] = useState<string>(s.previousA);
  const [analysis, setAnalysis] = useState<string>('\u00A0'); // space
  const [availablePapers, setAvailablePapers] = useState<string[]>([]);

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

  const newMessage = async (new_input: string) => {
    console.log('New message: ', new_input);
    if (!user) return;
    // Get server time
    const now = await serverTime();
    // const name = isQuestion ? 'SAGE' : user?.data.name;
    // Add messages
    const initialAnswer = {
      id: genId(),
      userId: user._id,
      creationId: '',
      creationDate: now.epoch,
      userName: 'SAGE',
      query: new_input,
      response: 'Working on it...',
    };
    updateState(props._id, { ...s, messages: [...s.messages, initialAnswer] });

    setAnalysis('Direct question to SAGE.');
    setProcessing(true);

    // Send request to backend
    const pdfUrl = 'http://localhost:8081/query';
    console.log('pdfUrl: ', pdfUrl);

    const res = await fetch(pdfUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: new_input }),
    });

    const data = await res.json();
    console.log('Data: ', data);

    updateState(props._id, {
      ...s,
      previousQ: new_input,
      previousA: data.response ? data.response : 'An error has occurred',
      messages: [
        ...s.messages,
        initialAnswer,
        {
          id: genId(),
          userId: user._id,
          creationId: '',
          creationDate: now.epoch + 1,
          userName: 'SAGE',
          query: '',
          response: data.response ? data.response : 'An error has occurred',
        },
      ],
    });

    setProcessing(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    setInput('');
    console.log('Sending message: ', text);
    await newMessage(text);
  };

  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  const goToBottom = (mode: ScrollBehavior = 'smooth') => {
    // Scroll to bottom of chat box smoothly
    chatBox.current?.scrollTo({
      top: chatBox.current?.scrollHeight,
      behavior: mode,
    });
  };

  const stopSAGE = async () => {
    setProcessing(false);
    setAnalysis('\u00A0');
    if (ctrlRef.current && user) {
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
              userName: 'SAGE',
              query: '',
              response: streamText + '...(interrupted)',
            },
          ],
        });
      }
      setStreamText('');
    }
  };

  async function getAvailablePdfs() {
    if (!user) return;
    console.log('Getting available papers');
    // Get current pdfs
    const now = await serverTime();

    const url = 'http://localhost:8081/available_papers';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      console.log('Available papers: ', data);
      updateState(props._id, {
        ...s,
        messages: [
          ...s.messages,
          {
            id: genId(),
            userId: user._id,
            creationId: '',
            creationDate: now.epoch + 1,
            userName: 'SAGE',
            query: '',
            response: data.papers
              ? data.papers.length > 0
                ? data.papers.join(',\n')
                : 'No papers are currently uploaded.'
              : 'An error has occurred',
          },
        ],
      });
    }
  }

  // Reset the chat: clear previous question and answer, and all the messages
  const resetSAGE = () => {
    setPreviousQuestion('');
    setPreviousAnswer('');
    setAnalysis('\u00A0');
    updateState(props._id, { ...s, previousA: '', previousQ: '', messages: initialState.messages });
  };

  useEffect(() => {
    // Scroll to bottom of chat box immediately
    chatBox.current?.scrollTo({
      top: chatBox.current?.scrollHeight,
      behavior: 'instant',
    });
    // Control the scrolling of the chat box
    chatBox.current?.addEventListener('scrollend', () => {
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

  // Wait for new messages to scroll to the bottom
  useEffect(() => {
    if (!processing && !scrolled) {
      // Scroll to bottom of chat box smoothly
      goToBottom();
    }
    if (scrolled) setNewMessages(true);
  }, [s.messages]);

  return (
    <AppWindow app={props} hideBackgroundIcon={MdChat}>
      <Flex gap={2} p={2} minHeight={'max-content'} direction={'column'} h="100%" w="100%">
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
            const previousTime = message.creationDate;
            const now = Date.now();
            const diff = now - previousTime - 30 * 60 * 1000; // minus 30 minutes
            const when = diff > 0 ? formatDistance(previousTime, now, { addSuffix: true }) : '';
            const last = index === sortedMessages.length - 1;

            return (
              <Fragment key={index}>
                {/* Start of User Messages */}
                {message.query.length ? (
                  <Box position="relative" my={1}>
                    {isMe ? (
                      <Box top="-15px" right={'15px'} position={'absolute'} textAlign={'right'}>
                        <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                          Me
                        </Text>
                      </Box>
                    ) : (
                      <Box top="-15px" left={'15px'} position={'absolute'} textAlign={'right'}>
                        <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                          {message.userName}
                        </Text>
                      </Box>
                    )}

                    <Box display={'flex'} justifyContent={isMe ? 'right' : 'left'}>
                      <Tooltip
                        whiteSpace={'nowrap'}
                        textOverflow="ellipsis"
                        fontSize={'xs'}
                        placement="top"
                        hasArrow={true}
                        label={time}
                        openDelay={400}
                      >
                        <Box
                          color="white"
                          rounded={'md'}
                          boxShadow="md"
                          fontFamily="arial"
                          textAlign={isMe ? 'right' : 'left'}
                          bg={isMe ? myColor : otherUserColor}
                          p={1}
                          m={3}
                          maxWidth="70%"
                          userSelect={'none'}
                          onDoubleClick={() => {
                            if (navigator.clipboard) {
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
                            }
                          }}
                          draggable={true}
                          // Store the query into the drag/drop events to create stickies
                          onDragStart={(e) => {
                            e.dataTransfer.clearData();
                            // Will create a new sticky
                            e.dataTransfer.setData('app', 'Stickie');
                            // Get the color of the user
                            const colorMessage = isMe
                              ? user?.data.color
                              : users.find((u) => u._id === message.userId)?.data.color || 'blue';
                            // Put the state of the app into the drag/drop events
                            e.dataTransfer.setData(
                              'app_state',
                              JSON.stringify({
                                color: colorMessage,
                                text: message.query,
                                fontSize: 24,
                              })
                            );
                          }}
                        >
                          {message.query}
                        </Box>
                      </Tooltip>
                    </Box>
                  </Box>
                ) : null}

                {/* Start of SAGE Messages */}
                {message.response.length ? (
                  <Box position="relative" my={1} maxWidth={'70%'}>
                    <Box top="0" left={'15px'} position={'absolute'} textAlign="left">
                      <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                        {message.userName}
                      </Text>
                    </Box>

                    <Box display={'flex'} justifyContent="left" position={'relative'} top={'15px'} mb={'15px'}>
                      <Tooltip
                        whiteSpace={'nowrap'}
                        textOverflow="ellipsis"
                        fontSize={'xs'}
                        placement="top"
                        hasArrow={true}
                        label={time}
                        openDelay={400}
                      >
                        <Box
                          boxShadow="md"
                          color="white"
                          rounded={'md'}
                          textAlign={'left'}
                          bg={sageColor}
                          p={1}
                          m={3}
                          fontFamily="arial"
                          onDoubleClick={() => {
                            if (navigator.clipboard) {
                              // Copy into clipboard
                              navigator.clipboard.writeText(message.response);
                              // Notify the user
                              toast({
                                title: 'Success',
                                description: `Content Copied to Clipboard`,
                                duration: 3000,
                                isClosable: true,
                                status: 'success',
                              });
                            }
                          }}
                        >
                          <Box
                            pl={3}
                            draggable={true}
                            onDragStart={(e) => {
                              // Store the response into the drag/drop events to create stickies
                              e.dataTransfer.clearData();
                              e.dataTransfer.setData('app', 'Stickie');
                              e.dataTransfer.setData(
                                'app_state',
                                JSON.stringify({
                                  color: 'purple',
                                  text: message.response,
                                  fontSize: 24,
                                })
                              );
                            }}
                          >
                            <Markdown style={{ textIndent: '4px', userSelect: 'none' }}>{message.response}</Markdown>
                          </Box>
                        </Box>
                      </Tooltip>
                    </Box>
                  </Box>
                ) : null}

                {when && !last ? (
                  <Box position="relative" padding="4">
                    <Center>
                      <Divider width={'80%'} borderColor={'ActiveBorder'} />
                      <AbsoluteCenter bg={bgColor} px="4">
                        {when}
                      </AbsoluteCenter>
                    </Center>
                  </Box>
                ) : null}
              </Fragment>
            );
          })}

          {/* In progress SAGE Messages */}
          {streamText && (
            <Box position="relative" my={1} maxWidth={'70%'}>
              <Box top="0" left={'15px'} position={'absolute'} textAlign="left">
                <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                  AI is typing...
                </Text>
              </Box>

              <Box display={'flex'} justifyContent="left" position={'relative'} top={'15px'} mb={'15px'}>
                <Box boxShadow="md" color="white" rounded={'md'} textAlign={'left'} bg={aiTypingColor} p={1} m={3} fontFamily="arial">
                  {streamText}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
        <Button
          w="100%"
          onClick={() => {
            getAvailablePdfs();
          }}
        >
          List Available Papers
        </Button>
        <HStack>
          <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={newMessages ? 'New Messages' : 'No New Messages'} openDelay={400}>
            <IconButton
              aria-label="Messages"
              size={'xs'}
              p={0}
              m={0}
              colorScheme={newMessages ? 'green' : 'blue'}
              variant="ghost"
              icon={<MdExpandCircleDown size="24px" />}
              isDisabled={!newMessages}
              isLoading={processing}
              onClick={() => goToBottom('instant')}
              width="33%"
            />
          </Tooltip>
          <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Stop SAGE'} openDelay={400}>
            <IconButton
              aria-label="stop"
              size={'xs'}
              p={0}
              m={0}
              colorScheme={'blue'}
              variant="ghost"
              icon={<MdStopCircle size="24px" />}
              onClick={stopSAGE}
              width="34%"
            />
          </Tooltip>
          <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Reset Chat'} openDelay={400}>
            <IconButton
              aria-label="reset"
              size={'xs'}
              p={0}
              m={0}
              colorScheme={'blue'}
              variant="ghost"
              icon={<MdChangeCircle size="24px" />}
              onClick={resetSAGE}
              width="33%"
            />
          </Tooltip>
        </HStack>
        <InputGroup bg={'blackAlpha.100'}>
          <Input
            placeholder={'Chat with friends or ask SAGE with @S' + (selectedModel?.model ? ' (' + selectedModel.model + ')' : ' ')}
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

        <Box bg={'blackAlpha.100'} rounded={'sm'} p={1} m={0}>
          <Text width="100%" whiteSpace={'nowrap'} textOverflow="ellipsis" color={fgColor} fontSize="2xs">
            {analysis}
          </Text>
        </Box>
      </Flex>
    </AppWindow>
  );
}

/* App toolbar component for the app Chat */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const { user } = useUser();
  // Sort messages by creation date to display in order
  const sortedMessages = s.messages ? s.messages.sort((a, b) => a.creationDate - b.creationDate) : [];

  // Download the stickie as a text file
  const downloadTxt = () => {
    // Rebuid the content as text
    let content = '';
    sortedMessages.map((message) => {
      const isMe = user?._id == message.userId;
      if (message.query.length) {
        if (isMe) {
          content += `Me> ${message.query}\n`;
        } else {
          content += `${message.userName}> ${message.query} \n`;
        }
      }
      if (message.response.length) {
        if (message.response !== 'Working on it...') {
          content += `SAGE> ${message.response} \n`;
        }
      }
    });

    // Current date
    const dt = format(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with date
    const filename = 'sage-' + dt + '.txt';
    // Go for download
    downloadFile(txturl, filename);
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top-start" hasArrow={true} label={'Download Transcript'} openDelay={400}>
          <Button onClick={downloadTxt}>
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

function getDateString(epoch: number): string {
  const date = new Date(epoch).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  const time = new Date(epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} - ${time}`;
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

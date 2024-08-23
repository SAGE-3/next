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
import { formatDistance } from 'date-fns';
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

// LLAMA2
const LLAMA2_SYSTEM_PROMPT = 'You are a helpful and honest assistant that answer questions in a concise fashion in Markdown format. You only return the content relevant to the question.';
// LLAMA3
const LLAMA3_SYSTEM_PROMPT = 'You are a helpful assistant, providing informative, conscise and friendly answers to the user in Markdown format. You only return the content relevant to the question.';
// Prompt to interject or not
const LLAMA3_INTERJECT = 'You are a helpful AI assistant with many names (sage, sage3, ai, siri, google, bixby, alexa) and able to understand intent in multi-party conversations. You will be given a sample conversation transcript between multiple users plus you, and asked a question.';


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
  const [analysis, setAnalysis] = useState<string>("\u00A0"); // space

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

  const sendMessage = async () => {
    const text = input.trim();
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

  // Update from server
  useEffect(() => {
    setPreviousQuestion(s.previousQ);
  }, [s.previousQ]);
  useEffect(() => {
    setPreviousAnswer(s.previousA);
  }, [s.previousA]);

  useEffect(() => {
    if (s.context) {
      // Quick summary
      const ctx = `SAGE, Please carefully read the following document text:

      <document>
      ${s.context}
      </document>

      After reading through the document, identify the main topics, themes, and key concepts that are covered.

      Then, extract 3-5 keywords that best capture the essence and subject matter of the document. These keywords should concisely represent the most important and central ideas conveyed by the text.

      Please list the keywords you came up in bold using the Markdown syntax.`;

      // Longer version
      // const ctx = `@G Your task is to generate a topic analysis on a set of documents that I will provide. Here are the documents:

      // <documents>
      // ${s.context}
      // </documents>

      // Please read through the documents carefully. Then, identify the main topics that are covered across the set of documents. For each key topic you identify:

      // - Write a sentence or two describing the essence of the topic
      // - Extract a few representative excerpts or quotes from the documents that relate to the topic
      // - Estimate approximately what percentage of the overall content across the documents is about this topic

      // Show your work and reasoning in a <scratchpad> before presenting your final topic analysis.

      // Then, provide your final topic analysis in a bulleted list format, with each bullet corresponding to one of the key topics you identified. For each topic, include the description, relevant excerpts, and estimated percentage of content about that topic.

      // Enclose your final topic analysis in <analysis> tags.`;
      newMessage(ctx);
      setInput('');
    }
  }, [s.context]);

  // Tokens coming from the server as a stream
  useEffect(() => {
    if (s.token) {
      setStreamText(s.token);
    } else {
      setStreamText('');
    }
    goToBottom('auto');
  }, [s.token]);

  const newMessage = async (new_input: string) => {
    if (!user) return;
    // Get server time
    const now = await serverTime();
    // Is it a question to SAGE?
    const isQuestion = new_input.startsWith('@S');
    const name = isQuestion ? 'SAGE' : user?.data.name;
    // Add messages
    const initialAnswer = {
      id: genId(),
      userId: user._id,
      creationId: '',
      creationDate: now.epoch,
      userName: name,
      query: new_input,
      response: isQuestion ? 'Working on it...' : '',
    };
    updateState(props._id, { ...s, messages: [...s.messages, initialAnswer] });
    if (isQuestion) {
      setAnalysis("Direct question to SAGE.");
      setProcessing(true);
      // Remove the @G from the question
      const request = isQuestion ? new_input.slice(2) : new_input;

      if (isQuestion) {
        let complete_request = '';
        if (previousQuestion && previousAnswer) {
          if (selectedModel?.model === 'llama2') {
            // schema for follow up questions:
            // https://huggingface.co/blog/llama2#how-to-prompt-llama-2
            // {{ user_msg_1 }} [/INST] {{ model_answer_1 }} </s>
            // <s>[INST] {{ user_msg_2 }} [/INST]
            complete_request = `${previousQuestion} [/INST] ${previousAnswer} </s> <s>[INST] ${request} [/INST]`;
          } else {
            // https://llama.meta.com/docs/model-cards-and-prompt-formats/meta-llama-3/
            // LLAMA3 schema for follow up questions:
            // <|begin_of_text|><|start_header_id|>system<|end_header_id|>
            // {{ system_prompt }}<|eot_id|><|start_header_id|>user<|end_header_id|>
            // {{ user_message_1 }}<|eot_id|><|start_header_id|>assistant<|end_header_id|>
            // {{ model_answer_1 }}<|eot_id|><|start_header_id|>user<|end_header_id|>
            // {{ user_message_2 }}<|eot_id|><|start_header_id|>assistant<|end_header_id|>
            complete_request = `<|begin_of_text|><|start_header_id|>system<|end_header_id|> ${LLAMA3_SYSTEM_PROMPT} <|eot_id|>
                 <|start_header_id|>user<|end_header_id|>
                 ${previousQuestion}<|eot_id|>
                 <|start_header_id|>assistant<|end_header_id|>
                 ${previousAnswer}<|eot_id|>
                 <|start_header_id|>user<|end_header_id|>
                 ${request} <|eot_id|>
                 <|start_header_id|>assistant<|end_header_id|>`;
          }
        } else {
          if (selectedModel?.model === 'llama2') {
            complete_request = `<s>[INST] <<SYS>> ${LLAMA2_SYSTEM_PROMPT} <</SYS>> ${request} [/INST]`;
          } else {
            // LLAMA3 question
            // <|begin_of_text|><|start_header_id|>system<|end_header_id|>
            // {{ system_prompt }}<|eot_id|><|start_header_id|>user<|end_header_id|>
            // {{ user_message }}<|eot_id|><|start_header_id|>assistant<|end_header_id|>
            complete_request = `<|begin_of_text|><|start_header_id|>system<|end_header_id|> ${LLAMA3_SYSTEM_PROMPT} <|eot_id|>
                   <|start_header_id|>user<|end_header_id|> ${request} <|eot_id|>
                   <|start_header_id|>assistant<|end_header_id|>`;
          }
        }

        // Send request to backend
        const backend = await AiAPI.chat.query({ input: complete_request || request, model: 'chat', max_new_tokens: 400, app_id: props._id });
        if (backend.success) {
          const new_text = backend.output || '';
          setProcessing(false);
          // Clear the stream text
          setStreamText('');
          ctrlRef.current = null;
          setPreviousAnswer(new_text);
          // Add messages
          updateState(props._id, {
            ...s,
            previousQ: request,
            previousA: new_text,
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
                response: new_text,
              },
            ],
          });
        }
      }
    } else {
      // Not a question to SAGE
      const sample = "The conversation transcript is contained in backtick delimiters below: ```\n" +
        new_input + "\n```";
      const question = "Question: you are an AI assistant and should reply only when being addressed by name. Looking at the last message from 'User' in the transcript, should an AI assistant interject this time? Respond in the following JSON format:\n\nreasoning: (give very brief reasoning here)\njudgement: INTERJECT|QUIET (choose one)";

      const test_request = `<|begin_of_text|>
      <|start_header_id|>system<|end_header_id|> ${LLAMA3_INTERJECT} <|eot_id|>
      <|start_header_id|>user<|end_header_id|> ${sample} <|eot_id|>
      <|start_header_id|>user<|end_header_id|> ${question} <|eot_id|>
      <|start_header_id|>assistant<|end_header_id|>`;

      const interject = await AiAPI.chat.query({ input: test_request, model: 'chat', max_new_tokens: 100 });
      if (interject && interject.success && interject.output) {
        try {
          const text = interject.output.replace(/(\r\n|\n|\r|```)/gm, '').trim();
          const json = JSON.parse(text);
          const reasoning = json.reasoning;
          const judgement = json.judgement;

          // Display the reasoning in the chat
          setAnalysis(reasoning);

          if (judgement === 'INTERJECT') {
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

            let complete_request = '';
            if (previousQuestion && previousAnswer) {
              if (selectedModel?.model === 'llama2') {
                complete_request = `${previousQuestion} [/INST] ${previousAnswer} </s> <s>[INST] ${new_input} [/INST]`;
              } else {
                complete_request = `<|begin_of_text|><|start_header_id|>system<|end_header_id|> ${LLAMA3_SYSTEM_PROMPT} <|eot_id|>
                     <|start_header_id|>user<|end_header_id|>
                     ${previousQuestion}<|eot_id|>
                     <|start_header_id|>assistant<|end_header_id|>
                     ${previousAnswer}<|eot_id|>
                     <|start_header_id|>user<|end_header_id|>
                     ${new_input} <|eot_id|>
                     <|start_header_id|>assistant<|end_header_id|>`;
              }
            } else {
              if (selectedModel?.model === 'llama2') {
                complete_request = `<s>[INST] <<SYS>> ${LLAMA2_SYSTEM_PROMPT} <</SYS>> ${new_input} [/INST]`;
              } else {
                complete_request = `<|begin_of_text|><|start_header_id|>system<|end_header_id|> ${LLAMA3_SYSTEM_PROMPT} <|eot_id|>
                       <|start_header_id|>user<|end_header_id|> ${new_input} <|eot_id|>
                       <|start_header_id|>assistant<|end_header_id|>`;
              }
            }
            // Send request to backend
            const backend = await AiAPI.chat.query({ input: complete_request, model: 'chat', max_new_tokens: 400, app_id: props._id });
            if (backend.success) {
              const new_text = backend.output || '';
              setProcessing(false);
              // Clear the stream text
              setStreamText('');
              ctrlRef.current = null;
              setPreviousAnswer(new_text);
              // Add messages
              updateState(props._id, {
                ...s,
                previousQ: new_input,
                previousA: new_text,
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
                    response: new_text,
                  },
                ],
              });
            }
          }

        } catch (error) {
          setAnalysis("Inconclusive answer from SAGE. Please try again.");
        }
      }
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
    setAnalysis("\u00A0");
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

  // Reset the chat: clear previous question and answer, and all the messages
  const resetSAGE = () => {
    setPreviousQuestion('');
    setPreviousAnswer('');
    setAnalysis("\u00A0");
    updateState(props._id, { ...s, previousA: '', previousQ: '', messages: initialState.messages });
  };

  useEffect(() => {

    async function fetchStatus() {
      const response = await AiAPI.chat.status();
      const models = response.onlineModels as modelInfo[];
      // setOnlineModels(models);
      if (response.onlineModels.length > 0) setSelectedModel(models[0]);
    }
    fetchStatus();

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
          {
            streamText && (
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
            )
          }
        </Box>
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
            placeholder={"Chat with friends or ask SAGE with @S" + (selectedModel?.model ? " (" + selectedModel.model + ")" : " ")}
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

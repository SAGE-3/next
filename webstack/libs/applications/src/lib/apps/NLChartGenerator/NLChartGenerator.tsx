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
  Image,
} from '@chakra-ui/react';
import { MdSend, MdExpandCircleDown, MdStopCircle, MdChangeCircle, MdFileDownload } from 'react-icons/md';
import vegaEmbed from 'vega-embed';

// Date management
import { formatDistance } from 'date-fns';
import { format } from 'date-fns/format';
// Markdown
import Markdown from 'markdown-to-jsx';
// OpenAI API v4
import OpenAI from 'openai';

import { useAppStore, useHexColor, useUser, serverTime, downloadFile, useUsersStore, useConfigStore } from '@sage3/frontend';
import { genId } from '@sage3/shared';

import { App } from '../../schema';
import { state as AppState, init as initialState } from './index';
import { AppWindow } from '../../components';

import Dictation from './Dictation';
import mute from './arti_images/mute.gif';
import talking from './arti_images/talking.gif';
import thinking from './arti_images/thinking.gif';
import idle from './arti_images/idle.gif';

function convertObjectToArray(dataObject: any) {
  const keys = Object.keys(dataObject);
  const length = dataObject[keys[0]].length;
  const dataArray = [];

  for (let i = 0; i < length; i++) {
    const record: any = {};
    keys.forEach((key) => {
      record[key] = dataObject[key][i];
    });
    dataArray.push(record);
  }
  return dataArray;
}

function getCode(jsonInput: string) {
  // Remove the ```json and ``` characters
  const cleanJson = jsonInput
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace('url', 'values')
    // .replace('"data.json"', '`${data}`')
    .trim();
  return cleanJson;
}

// function replaceData(jsonInput: string) {
//   const cleanJson = jsonInput.replace('data');
//   return cleanJson;
// }

// LLAMA2 API
//  - API: https://huggingface.github.io/text-generation-inference/
const LLAMA2_SERVER = 'https://compaasgold03.evl.uic.edu';
const LLAMA2_ENDPOINT = '/generate_stream';
const LLAMA2_URL = LLAMA2_SERVER + LLAMA2_ENDPOINT;
const LLAMA2_TOKENS = 300;
const LLAMA2_SYSTEM_PROMPT =
  'I have a json file with the following headers: Station_ID, Date_Time, pressure_set_1, air_temp_set_1, relative_humidity_set_1, \
wind_speed_set_1, wind_direction_set_1, wind_gust_set_1, solar_radiation_set_1, soil_temp_set_1, \
soil_temp_set_2, soil_temp_set_3, soil_temp_set_4, precip_accum_five_minute_set_1, soil_moisture_set_1, \
soil_moisture_set_2, soil_moisture_set_3, volt_set_1, net_radiation_set_1, net_radiation_sw_set_1, net_radiation_lw_set_1, \
outgoing_radiation_lw_set_1, outgoing_radiation_sw_set_1, incoming_radiation_lw_set_1, outgoing_radiation_lw_set_1, wind_cardinal_direction_set_1d, \
heat_index_set_1d, dew_point_temperature_set_1d, altimeter_set_1d, sea_level_pressure_set_1d\
 You are an expert at creating data visualizations in vega-lite. you are strictly answering my questions only in vega-lite code.';

// OpenAI API
let OPENAI_API_KEY = '';
let OPENAI_ENGINE = 'gpt-4-turbo-preview';
const OPENAI_TOKENS = 300;
const OPENAI_SYSTEM_PROMPT =
  'I have a data.json file with the following headers: date_time, pressure_set_1, air_temp_set_1, relative_humidity_set_1, \
wind_speed_set_1, wind_direction_set_1, wind_gust_set_1, solar_radiation_set_1, soil_temp_set_1, \
soil_temp_set_2, soil_temp_set_3, soil_temp_set_4, precip_accum_five_minute_set_1, soil_moisture_set_1, \
soil_moisture_set_2, soil_moisture_set_3, volt_set_1, net_radiation_set_1, net_radiation_sw_set_1, net_radiation_lw_set_1, \
outgoing_radiation_lw_set_1, outgoing_radiation_sw_set_1, incoming_radiation_lw_set_1, outgoing_radiation_lw_set_1, wind_cardinal_direction_set_1d, \
heat_index_set_1d, dew_point_temperature_set_1d, altimeter_set_1d, sea_level_pressure_set_1d\
 You are an expert at creating data visualizations in vega-lite. you are strictly answering my questions only in vega-lite code.\
 Answer very concisely and in vega-lite code only. Remove the "$schema": "https://vega.github.io/schema/vega-lite/v5.json" from the vega-lite code';

/* App component for Chat */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();

  // Colors for Dark theme and light theme
  const myColor = useHexColor(user?.data.color || 'blue');
  const geppettoColor = useHexColor('purple');
  const openaiColor = useHexColor('green');
  const aiTypingColor = useHexColor('orange');
  const otherUserColor = useHexColor('gray');
  const bgColor = useColorModeValue('gray.200', 'gray.800');
  const sc = useColorModeValue('gray.400', 'gray.200');
  const scrollColor = useHexColor(sc);
  const textColor = useColorModeValue('gray.700', 'gray.100');
  // Get presences of users
  const users = useUsersStore((state) => state.users);
  // Configuration information
  const config = useConfigStore((state) => state.config);

  const [data, setData] = useState({});

  const [openai, setOpenai] = useState<OpenAI>();
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

  const chatBox = useRef<null | HTMLDivElement>(null);
  const ctrlRef = useRef<null | AbortController>(null);

  const [vegaLiteSpecs, setVegaLiteSpecs] = useState<any>([]);

  const [spec, setSpec] = useState<any>(null);

  const createApp = useAppStore((state) => state.create);

  // Display some notifications
  const toast = useToast();

  const [artiState, setArtiState] = useState(idle);

  // Sort messages by creation date to display in order
  const sortedMessages = s.messages ? s.messages.sort((a, b) => a.creationDate - b.creationDate) : [];

  useEffect(() => {
    const fetchData = async () => {
      let tmpStationMetadata: any = [];
      let url = '';
      url = `https://api.mesowest.net/v2/stations/timeseries?STID=017HI&showemptystations=1&start=202401181356&end=202401191356&token=d8c6aee36a994f90857925cea26934be&complete=1&obtimezone=local`;
      try {
        const response = await fetch(url);
        const sensor = await response.json();

        if (sensor) {
          const sensorData = sensor['STATION'];
          tmpStationMetadata = sensorData;
        }
        const tmpData = convertObjectToArray(tmpStationMetadata[0].OBSERVATIONS);
        setData(tmpData);
      } catch (error) {
        console.log('Error in 1');
        console.log(error);
      }
    };
    fetchData();
  }, []);

  // Input text for query
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const onSubmit = (e: React.KeyboardEvent) => {
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      e.preventDefault();
      send(input);
    }
  };
  const send = async (text: string) => {
    console.log('I am sending');
    await newMessage(text.trim());
    setInput('');
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
      const ctx = `@G I want to ask questions about this topic: ${s.context}`;
      newMessage(ctx);
      setInput('');
    }
  }, [s.context]);

  const newMessage = async (new_input: string) => {
    if (!user) return;
    // Get server time
    const now = await serverTime();
    // Is it a question to Geppetto?

    // Add messages
    const initialAnswer = {
      id: genId(),
      userId: user._id,
      creationId: '',
      creationDate: now.epoch,
      userName: name,
      query: new_input,
      response: 'Working on it...',
    };
    updateState(props._id, { ...s, messages: [...s.messages, initialAnswer] });
    if (openai) {
      setArtiState(thinking);
      setProcessing(true);
      // Remove the @X
      const request = new_input.slice(2);
      // Object to stop the request and the stream of events
      const ctrl = new AbortController();
      // Save the controller for later use
      ctrlRef.current = ctrl;
      // Build the request
      let tempText = '';
      setStreamText(tempText);

      const complete_request = [
        { role: 'system', content: OPENAI_SYSTEM_PROMPT },
        { role: 'user', content: request },
      ];

      const stream = await openai.chat.completions.create({
        model: OPENAI_ENGINE,
        // @ts-expect-error
        messages: complete_request,
        // max_tokens: OPENAI_TOKENS,
        temperature: 0.2,
        stream: true,
      });
      for await (const part of stream) {
        const text = part.choices[0]?.delta?.content;

        if (text) {
          tempText += part.choices[0]?.delta?.content;
          setStreamText(tempText);
          goToBottom('auto');
        }
      }
      setProcessing(false);
      // Clear the stream text
      setStreamText('');
      ctrlRef.current = null;
      setPreviousAnswer(tempText);
      try {
        const codeFromText = getCode(tempText);

        const code = JSON.parse(codeFromText);
        code.data.values = data;
        tempText = 'I have generated the chart for you.';
        // setSpec(code);
        console.log(code);
        setVegaLiteSpecs((prev: any) => [...prev, code]);
        setArtiState(idle);
        await createApp({
          title: 'VegaLiteViewer',
          roomId: props.data.roomId!,
          boardId: props.data.boardId!,
          //TODO get middle of the screen space
          position: {
            x: props.data.position.x + props.data.size.width,
            y: props.data.position.y,
            z: 0,
          },
          size: {
            width: props.data.size.width,
            height: props.data.size.height,
            depth: 0,
          },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'VegaLiteViewer',
          state: {
            spec: codeFromText,
            error: false,
            isHCDPChart: true,
          },

          raised: true,
          dragging: false,
          pinned: false,
        });
        // Add messages
        updateState(props._id, {
          ...s,
          previousQ: request,
          previousA: tempText,
          messages: [
            ...s.messages,
            initialAnswer,
            {
              id: genId(),
              userId: user._id,
              creationId: '',
              creationDate: now.epoch + 1,
              userName: 'OpenAI',
              query: '',
              response: tempText,
            },
          ],
        });
      } catch (e) {
        tempText = 'An error occured while generating the chart. Please try again.';
        console.log(e);
        updateState(props._id, {
          ...s,
          previousQ: request,
          previousA: tempText,
          messages: [
            ...s.messages,
            initialAnswer,
            {
              id: genId(),
              userId: user._id,
              creationId: '',
              creationDate: now.epoch + 1,
              userName: 'OpenAI',
              query: '',
              response: tempText,
            },
          ],
        });
      }
    }

    setTimeout(() => {
      // Scroll to bottom of chat box smoothly
      goToBottom();
    }, 100);
  };

  const goToBottom = (mode: ScrollBehavior = 'smooth') => {
    // Scroll to bottom of chat box smoothly
    chatBox.current?.scrollTo({
      top: chatBox.current?.scrollHeight,
      behavior: mode,
    });
  };

  const stopGeppetto = async () => {
    setProcessing(false);
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
              userName: 'Geppetto/OpenAI',
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
  const resetGepetto = () => {
    setPreviousQuestion('');
    setPreviousAnswer('');
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

    // API configuration
    // OPENAI_API_KEY = config.openai.apiKey || '';
    // OPENAI_ENGINE = config.openai.model || 'gpt-3.5-turbo';
    if (OPENAI_API_KEY) {
      const openaiClient = new OpenAI({
        apiKey: OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      });
      setOpenai(openaiClient);
    }
  }, []);

  // Wait for new messages to scroll to the bottom
  useEffect(() => {
    if (!processing && !scrolled) {
      // Scroll to bottom of chat box smoothly
      goToBottom();
    }
    if (scrolled) setNewMessages(true);
  }, [s.messages]);

  useEffect(() => {
    for (let i = 0; i < vegaLiteSpecs.length; i++) {
      console.log(vegaLiteSpecs[i]);
      // Render Vega-Lite
      // Put actions to false to hide the menu, but would be nice to add the controlbar
      vegaEmbed(`#vis${props._id + i}`, vegaLiteSpecs[i] as any, { actions: false });
    }
  }, [vegaLiteSpecs]);

  const generateChart = async (vegaLiteSpec: any) => {
    await createApp({
      title: 'VegaLiteViewer',
      roomId: props.data.roomId!,
      boardId: props.data.boardId!,
      //TODO get middle of the screen space
      position: {
        x: props.data.position.x + props.data.size.width,
        y: props.data.position.y,
        z: 0,
      },
      size: {
        width: props.data.size.width,
        height: props.data.size.height,
        depth: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'VegaLiteViewer',
      state: {
        spec: JSON.stringify(vegaLiteSpec),
        error: false,
        isHCDPChart: false,
      },

      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  return (
    <AppWindow app={props}>
      <>
        <Box>
          <Image boxSize={'xs'} src={artiState} />
          <Dictation send={send} setArtiState={setArtiState} artiState={artiState} />
          <HStack overflowX="auto">
            {vegaLiteSpecs.map((vegaLiteSpec: any, index: number) => {
              return (
                <Box
                  onClick={() => generateChart(vegaLiteSpec)}
                  cursor={'pointer'}
                  zIndex={0}
                  backgroundColor="#ffffff"
                  p="1rem"
                  border="2px solid black"
                  rounded="lg"
                  m="1rem"
                >
                  <div style={{ zIndex: -1, width: vegaLiteSpec.width, height: vegaLiteSpec.height }} id={`vis${props._id + index}`}></div>
                </Box>
              );
            })}
          </HStack>
        </Box>
        <Flex gap={2} p={2} minHeight={'max-content'} direction={'column'} h="65%" w="100%">
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

                  {/* Start of Geppetto Messages */}
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
                            bg={message.userName === 'OpenAI' ? openaiColor : geppettoColor}
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
                                    color: message.userName === 'OpenAI' ? 'green' : 'purple',
                                    text: message.response,
                                    fontSize: 24,
                                  })
                                );
                              }}
                            >
                              <Markdown style={{ marginLeft: '15px', textIndent: '4px', userSelect: 'none' }}>{message.response}</Markdown>
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

            {/* In progress Geppetto Messages */}
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
          <HStack>
            <Tooltip
              fontSize={'xs'}
              placement="top"
              hasArrow={true}
              label={newMessages ? 'New Messages' : 'No New Messages'}
              openDelay={400}
            >
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
            <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Stop Geppetto'} openDelay={400}>
              <IconButton
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                icon={<MdStopCircle size="24px" />}
                onClick={stopGeppetto}
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
                onClick={resetGepetto}
                width="33%"
              />
            </Tooltip>
          </HStack>
          <InputGroup bg={'blackAlpha.100'}>
            <Input
              placeholder="Ask the agent to generate a chart..."
              size="md"
              variant="outline"
              _placeholder={{ color: 'inherit' }}
              onChange={handleChange}
              onKeyDown={onSubmit}
              value={input}
              ref={inputRef}
            />
            <InputRightElement onClick={() => send(input)}>
              <MdSend color="green.500" />
            </InputRightElement>
          </InputGroup>
        </Flex>
      </>
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
          content += `Geppetto> ${message.response} \n`;
        }
      }
    });

    // Current date
    const dt = format(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with date
    const filename = 'geppetto-' + dt + '.txt';
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

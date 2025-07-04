/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, Fragment, useEffect } from 'react';
import { useParams } from 'react-router';
import {
  ButtonGroup,
  Button,
  useToast,
  IconButton,
  Box,
  Text,
  Flex,
  useColorModeValue,
  Tooltip,
  InputGroup,
  InputRightElement,
  HStack,
  Divider,
  Center,
  AbsoluteCenter,
  List,
  ListIcon,
  ListItem,
  Textarea,
  useDisclosure,
  Table,
  Tr,
  Td,
  Th,
  Thead,
  Tbody,
} from '@chakra-ui/react';
import {
  MdSend,
  MdExpandCircleDown,
  MdStopCircle,
  MdChangeCircle,
  MdFileDownload,
  MdChat,
  MdSettings,
  MdOpenInNew,
} from 'react-icons/md';
import { BsCopy, BsCheck } from 'react-icons/bs';
import { HiCommandLine } from 'react-icons/hi2';

// Date management
import { formatDistance } from 'date-fns';
import { format } from 'date-fns/format';
// Markdown
import Markdown from 'markdown-to-jsx';

import { AppName } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import {
  useAppStore,
  useHexColor,
  useUser,
  serverTime,
  downloadFile,
  useUsersStore,
  useUserSettings,
  useUIStore,
  EditUserSettingsModal,
  useLinkStore,
  useAssetStore,
  apiUrls,
} from '@sage3/frontend';
import { genId, AskRequest, ImageQuery, PDFQuery, CodeRequest, WebQuery, WebScreenshot, isGeoJSON } from '@sage3/shared';

import { App } from '../../schema';
import { state as AppState, init as initialState } from './index';
import { AppWindow } from '../../components';

import { callImage, callPDF, callAsk, callCode, callWeb, callWebshot, callMesonet } from './tRPC';

// Override the default markdown options for lists
const MdOrderedList: React.FC<{ children: React.ReactNode }> = ({ children, ...props }) => (
  <ol style={{ paddingLeft: '24px' }} {...props}>
    {children}
  </ol>
);

const MdUnorderedList: React.FC<{ children: React.ReactNode }> = ({ children, ...props }) => (
  <ul style={{ paddingLeft: '24px' }} {...props}>
    {children}
  </ul>
);

const MdCode: React.FC<{ children: React.ReactNode }> = ({ children, ...props }) => {
  // @ts-ignore
  const lang = props.className ? props.className.replace('lang-', '') : 'text';
  const [copied, setCopied] = useState(false);
  return <Table variant="unstyled" size="sm" style={{
    borderSpacing: 0,
    borderCollapse: 'separate',
    borderRadius: '10px 10px 10px 10px',
    border: '1px solid black'
  }}>
    <Thead>
      <Tr backgroundColor="#e5e5e5">
        <Th style={{ borderRadius: '10px 10px 0 0' }} textTransform={'capitalize'} fontWeight={'normal'}>
          <Box display={"flex"} justifyContent={'space-between'}>
            <span><b>{lang}</b></span>
            <Box display={"flex"} alignItems={'center'} userSelect={'none'} _hover={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setCopied(true);
                // Copy the code to clipboard
                navigator.clipboard.writeText(children as string);
              }}>
              {copied ? <BsCheck /> : <BsCopy />} <span> {copied ? 'Copied' : 'Copy'} </span>
            </Box>
          </Box>
        </Th>
      </Tr>
    </Thead>
    <Tbody>
      <Tr>
        <Td style={{ padding: 0 }} colSpan={1}>
          <pre style={{ fontSize: 'smaller', paddingLeft: '24px', backgroundColor: '#fafafa', borderRadius: '0 0 10px 10px' }} {...props}>
            <code {...props} style={{ userSelect: "text" }}>
              {children}
            </code>
          </pre>
        </Td>
      </Tr>
    </Tbody>
  </Table >
};

type OperationMode = 'chat' | 'text' | 'image' | 'web' | 'pdf' | 'code' | 'map' | 'Hawaii Mesonet';

/* App component for Chat */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const { roomId, boardId } = useParams();

  const { user } = useUser();
  const [username, setUsername] = useState('');
  const createApp = useAppStore((state) => state.create);

  const [sourceApps, setSouceApps] = useState<string[]>([]);

  const links = useLinkStore((state) => state.links);
  const addLink = useLinkStore((state) => state.addLink);

  // Colors for Dark theme and light theme
  // Chat Bubble Colors
  const myColor = useHexColor(`blue.300`);
  const sageColor = useHexColor('purple.200');
  const aiTypingColor = useHexColor('orange.300');
  const otherUserColor = useHexColor('gray.300');
  // Background, scrollbar, and Foreground Colors
  const backgroundColor = useColorModeValue('gray.200', 'gray.600');
  const backgroundColorHex = useHexColor(backgroundColor);
  const bgColor = useColorModeValue('gray.100', 'gray.700');
  const fgColor = useColorModeValue('gray.900', 'gray.200');
  const sc = useColorModeValue('gray.300', 'gray.500');
  const scrollColor = useHexColor(sc);
  const textColor = useColorModeValue('gray.800', 'gray.100');

  const { isOpen: editSettingsIsOpen, onOpen: editSettingsOnOpen, onClose: editSettingsOnClose } = useDisclosure();

  // Is the app in focus mode?
  const isFocused = useUIStore((state) => state.focusedAppId === props._id);

  // App state management
  const updateState = useAppStore((state) => state.updateState);
  // Get presences of users
  const users = useUsersStore((state) => state.users);
  // Model Preferences
  const { settings } = useUserSettings();
  const [selectedModel, setSelectedModel] = useState(settings.aiModel);

  // Input text for query
  const [input, setInput] = useState<string>('');
  const [streamText, setStreamText] = useState<string>('');
  // Element to set the focus to when opening the dialog
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Processing
  const [processing, setProcessing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [newMessages, setNewMessages] = useState(false);

  const [previousQuestion, setPreviousQuestion] = useState<string>(s.previousQ);
  const [previousAnswer, setPreviousAnswer] = useState<string>(s.previousA);
  const [status] = useState<string>('AI can make mistakes. User caution is advised.');
  const [actions, setActions] = useState<any[]>([]);
  const [mode, setMode] = useState<OperationMode>('chat');
  const [location, setLocation] = useState('');

  const isSelected = useUIStore.getState().selectedAppId === props._id;
  const chatBox = useRef<null | HTMLDivElement>(null);
  const ctrlRef = useRef<null | AbortController>(null);

  // Display some notifications
  const toast = useToast();

  // Sort messages by creation date to display in order
  const sortedMessages = s.messages ? s.messages.sort((a, b) => a.creationDate - b.creationDate) : [];

  useEffect(() => {
    // Find the links that are "sources" to this app
    const sources = links
      .filter((el) => {
        return el.data.targetAppId === props._id;
      })
      .map((link) => link.data.sourceAppId);
    setSouceApps(sources);
  }, [links]);

  // Input text for query
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const sendMessage = async () => {
    const text = input.trim();
    setInput('');
    if (mode === 'image') {
      // Image
      onContentImage(text);
    } else if (mode === 'pdf') {
      // PDF
      onContentPDF(text);
    } else if (mode === 'code') {
      // Code
      onContentCode(text, '');
    } else if (mode === 'web') {
      // Code
      onContentWeb(text);
    } else if (mode === 'map') {
      // Map
      onContentMap(text);
    } else if (mode === 'Hawaii Mesonet') {
      // Code
      onContentMesonet(text);
    } else {
      await newMessage(text);
    }
  };
  const onSubmit = (e: React.KeyboardEvent) => {
    if (e.code === 'Escape') {
      // Deselect the text area
      inputRef.current?.blur();
      // Deselect the app
      useUIStore.getState().setSelectedApp('');
      return;
    }
    // Keyboard instead of pressing the button
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift + Enter
        e.preventDefault();
        setInput(input + '\n');
      } else {
        e.preventDefault();
        sendMessage();
      }
    }
  };

  useEffect(() => {
    if (inputRef.current && isSelected) {
      inputRef.current.focus();
    }
  }, [inputRef, isSelected]);

  useEffect(() => {
    if (user) {
      // User name
      const u = user.data.name;
      const firstName = u.split(' ')[0];
      setUsername(firstName);
      // Location
      navigator.geolocation.getCurrentPosition(
        function (location) {
          setLocation(location.coords.latitude + ',' + location.coords.longitude);
        },
        function (e) {
          console.log('Location> error', e);
        }
      );
    }
  }, [user]);

  // Update from server
  useEffect(() => {
    setPreviousQuestion(s.previousQ);
  }, [s.previousQ]);
  useEffect(() => {
    setPreviousAnswer(s.previousA);
  }, [s.previousA]);

  // Tokens coming from the server as a stream
  useEffect(() => {
    if (s.token) {
      setStreamText(s.token);
    } else {
      setStreamText('');
    }
    goToBottom('auto');
  }, [s.token]);

  useEffect(() => {
    if (s.firstQuestion) {
      newMessage('@S ' + s.firstQuestion);
    }
  }, [s.firstQuestion]);

  useEffect(() => {
    if (sourceApps && sourceApps.length >= 1) {
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));
      if (apps && apps[0] && apps[0].data.type === 'ImageViewer') {
        setMode('image');
      } else if (apps && apps[0] && apps[0].data.type === 'PDFViewer') {
        setMode('pdf');
      } else if (apps && apps[0] && apps[0].data.type === 'CodeEditor') {
        setMode('code');
      } else if (apps && apps[0] && apps[0].data.type === 'Webview') {
        setMode('web');
      } else if (apps && apps[0] && apps[0].data.type === 'Hawaii Mesonet') {
        setMode('Hawaii Mesonet');
      } else if (apps && apps[0] && apps[0].data.type === 'Map') {
        setMode('map');
      } else {
        setMode('text');
      }
    }
  }, [sourceApps]);

  const newMessage = async (new_input: string) => {
    if (!user) return;
    // Get server time
    const now = await serverTime();
    // Is it a question to SAGE?
    const isQuestion = new_input.toUpperCase().startsWith('@S');
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
      setProcessing(true);
      // Remove the @S from the question
      const request = isQuestion ? new_input.slice(2) : new_input;

      if (isQuestion) {
        const ctx = `Please carefully read the following text:
        <text>
        ${s.context}
        </text>
        ${request}`;

        const body: AskRequest = {
          ctx: {
            previousQ: previousQuestion,
            previousA: previousAnswer,
            pos: [props.data.position.x + props.data.size.width + 20, props.data.position.y],
            roomId: roomId!,
            boardId: boardId!,
          },
          user: username,
          id: genId(),
          model: selectedModel || 'llama',
          location: location,
          q: s.context ? ctx : request,
        };
        const response = await callAsk(body);
        if ('message' in response) {
          toast({
            title: 'Error',
            description: response.message || 'Error sending query to the agent. Please try again.',
            status: 'error',
            duration: 4000,
            isClosable: true,
          });
        } else {
          const new_text = response.r || '';
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
          // Check if there are actions to be taken
          if (response.actions && response.actions.length > 0) {
            setActions(response.actions);
          }
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
    updateState(props._id, { ...s, previousA: '', previousQ: '', messages: initialState.messages });
    setProcessing(false);
    setActions([]);
  };

  const onSummary = async () => {
    if (!user) return;
    // Get the current context
    let newctx = s.context;
    if (!newctx && sourceApps.length > 0) {
      // Update the context with the stickies
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));
      newctx = apps.reduce((accumulate, app) => {
        if (app.data.type === 'Stickie') accumulate += app.data.state.text + '\n\n';
        return accumulate;
      }, '');
    }
    if (newctx) {
      // Summary prompt
      const ctx = `@S, Please carefully read the following document text:
        <document>
        ${newctx}
        </document>
        After reading through the document, identify the main topics, themes, and key concepts that are covered.
        Provide all your answers in a few sentences.`;
      newMessage(ctx);
      setInput('');
    }
  };

  const onImageSummary = async () => {
    return onContentImage('Describe the image in details');
  };
  const onImageCaption = async () => {
    return onContentImage('Generate a caption for the image, fit for a scientific publication');
  };
  const onImageProsCons = async () => {
    return onContentImage('Describe the good parts and then the bad parts of the image at conveying its message');
  };
  const onImageKeywords = async () => {
    return onContentImage('Read the image and extract 3-5 keywords that best capture the essence and subject matter of the image');
  };
  const onImageFacts = async () => {
    return onContentImage('Read the image and provide two or three interesting facts from the image');
  };

  const onContentImage = async (prompt: string) => {
    if (!user) return;
    if (sourceApps.length > 0) {
      // Update the context with the stickies
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));

      // Check for image
      if (apps && apps[0].data.type === 'ImageViewer') {
        if (roomId && boardId) {
          const now = await serverTime();
          const initialAnswer = {
            id: genId(),
            userId: user._id,
            creationId: '',
            creationDate: now.epoch,
            userName: 'SAGE',
            query: prompt,
            response: 'Working on it...',
          };
          updateState(props._id, { ...s, messages: [...s.messages, initialAnswer] });

          const assetid = apps[0].data.state.assetid;
          // Build the query
          const q: ImageQuery = {
            ctx: {
              previousQ: previousQuestion,
              previousA: previousAnswer,
              pos: [props.data.position.x + props.data.size.width + 20, props.data.position.y],
              roomId,
              boardId,
            },
            q: prompt,
            user: username,
            asset: assetid,
            model: selectedModel || 'llama',
          };
          setProcessing(true);
          setActions([]);
          // Invoke the agent
          const response = await callImage(q);
          setProcessing(false);

          if ('message' in response) {
            toast({
              title: 'Error',
              description: response.message || 'Error sending query to the agent. Please try again.',
              status: 'error',
              duration: 4000,
              isClosable: true,
            });
          } else {
            // Clear the stream text
            setStreamText('');
            ctrlRef.current = null;
            setPreviousAnswer(response.r);
            // Add messages
            updateState(props._id, {
              ...s,
              previousQ: 'Describe the content',
              previousA: response.r,
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
                  response: response.r,
                },
              ],
            });
            if (response.actions) {
              setActions(response.actions);
            }
          }
        }
      }
    }
  };

  const onMesonetSummary = async () => {
    return onContentMesonet('Summarize the key weather patterns from the Mesonet dataset.');
  };
  const onMesonetTrends = async () => {
    return onContentMesonet('Identify key trends in the Mesonet weather data.');
  };
  const onMesonetComparison = async () => {
    return onContentMesonet('Compare weather conditions between different Mesonet stations.');
  };
  const onMesonetForecast = async () => {
    return onContentMesonet('Provide insights based on past data to predict future weather trends.');
  };
  const onMesonetExtremes = async () => {
    return onContentMesonet('Find the extreme values (highest and lowest) recorded in the dataset.');
  };

  const onContentMesonet = async (prompt: string) => {
    if (!user) return;
    if (selectedModel == 'llama') {
      toast({
        title: 'Mesonet Feature not available for llama model',
        description: 'Please switch SAGE Intelligence to OpenAI in User Settings.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    if (sourceApps && sourceApps.length >= 1) {
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));
      if (apps && apps[0].data.type === 'Hawaii Mesonet') {
        const url = apps[0].data.state.url;
        if (roomId && boardId) {
          const now = await serverTime();
          const isoNow = new Date();
          const isoString = isoNow.toISOString();
          const initialAnswer = {
            id: genId(),
            userId: user._id,
            creationId: '',
            creationDate: now.epoch,
            userName: 'SAGE',
            query: prompt,
            response: 'Working on it...',
          };
          updateState(props._id, { ...s, messages: [...s.messages, initialAnswer] });

          const q = {
            ctx: {
              previousQ: previousQuestion,
              previousA: previousAnswer,
              pos: [props.data.position.x + props.data.size.width + 20, props.data.position.y],
              roomId,
              boardId,
            },
            q: prompt,
            url: url,
            user: username,
            currentTime: isoString,
          };
          setProcessing(true);
          setActions([]);
          const response = await callMesonet(q);
          setProcessing(false);

          if ('message' in response) {
            toast({
              title: 'Error',
              description: response.message || 'Error sending query to the agent. Please try again.',
              status: 'error',
              duration: 4000,
              isClosable: true,
            });
          } else {
            setStreamText('');
            ctrlRef.current = null;
            setPreviousAnswer(response.summary);
            // Update the Mesonet app's state with the selected stations
            // if (response.stations && response.stations.length > 0) {
            //   const mesonetApp = apps[0];
            //   updateState(mesonetApp._id, {
            //     ...mesonetApp.data.state,
            //     stationNames: response.stations,

            //     widget: {
            //       ...mesonetApp.data.state.widget,
            //       yAxisNames: response.attributes,
            //     },
            //   });
            // }

            updateState(props._id, {
              ...s,
              previousQ: 'Describe the content',
              previousA: response.summary,
              messages: [
                ...s.messages,
                {
                  id: genId(),
                  userId: user._id,
                  creationId: '',
                  creationDate: now.epoch + 1,
                  userName: 'SAGE',
                  query: initialAnswer.query,
                  response: response.summary,
                },
              ],
            });
            if (response.actions) {
              setActions(response.actions);
            }
          }
        }
      }
    }
  };

  const mesonetPrompts: { title: string; action: () => void; prompt: string }[] = [
    // { title: 'Summarize Mesonet Data', action: onMesonetSummary, prompt: 'Summarize key weather patterns from the Mesonet dataset.' },
    // { title: 'Find Trends', action: onMesonetTrends, prompt: 'Identify key trends in the Mesonet weather data.' },
    // { title: 'Compare Locations', action: onMesonetComparison, prompt: 'Compare weather conditions between different Mesonet stations.' },
    // { title: 'Generate Forecast Insights', action: onMesonetForecast, prompt: 'Provide insights based on past data to predict trends.' },
    // { title: 'Find Extremes', action: onMesonetExtremes, prompt: 'Find the extreme values (highest and lowest) recorded in the dataset.' },
  ];

  const onContentPDF = async (prompt: string) => {
    if (!user) return;

    const isQuestion = prompt.toUpperCase().startsWith('@S');
    const name = isQuestion ? 'SAGE' : user?.data.name;

    if (sourceApps.length > 0) {
      // Update the context with the stickies
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));

      // Check for image
      if (apps && apps[0].data.type === 'PDFViewer') {
        if (roomId && boardId) {
          const now = await serverTime();
          const initialAnswer = {
            id: genId(),
            userId: user._id,
            creationId: '',
            creationDate: now.epoch,
            userName: name,
            query: prompt,
            response: isQuestion ? 'Working on it...' : '',
          };
          updateState(props._id, { ...s, messages: [...s.messages, initialAnswer] });

          if (isQuestion) {
            const request = isQuestion ? prompt.slice(2) : prompt;
            const assetids = apps.map((d) => d.data.state.assetid);
            // Build the query
            const q: PDFQuery = {
              ctx: {
                previousQ: previousQuestion,
                previousA: previousAnswer,
                pos: [props.data.position.x + props.data.size.width + 20, props.data.position.y],
                roomId,
                boardId,
              },
              q: request,
              user: username,
              assetids: assetids,
              model: selectedModel || 'openai',
            };
            setProcessing(true);
            setActions([]);
            // Invoke the agent
            const response = await callPDF(q);
            setProcessing(false);

            if ('message' in response) {
              const errorMessage = 'There has been an error, please try again or report it through the menu.';
              setStreamText('');
              setPreviousAnswer(errorMessage);
              updateState(props._id, {
                ...s,
                previousQ: q.q,
                previousA: errorMessage,
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
                    response: errorMessage,
                  },
                ],
              });
              toast({
                title: 'Error',
                description: response.message || 'Error sending query to the agent. Please try again.',
                status: 'error',
                duration: 4000,
                isClosable: true,
              });
            } else {
              // Clear the stream text
              setStreamText('');
              ctrlRef.current = null;
              setPreviousAnswer(response.r);
              // Add messages
              updateState(props._id, {
                ...s,
                previousQ: 'Describe the content',
                previousA: response.r,
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
                    response: response.r,
                  },
                ],
              });
              if (response.actions) {
                setActions(response.actions);
              }
            }
          }
        }
      }
    }
  };

  // Generic code to handle the web content
  const onContentWeb = async (prompt: string) => {
    if (!user) return;
    if (sourceApps.length > 0) {
      // Update the context with the stickies
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));

      // Check for image
      if (apps && apps[0].data.type === 'Webview') {
        if (roomId && boardId) {
          const now = await serverTime();
          const initialAnswer = {
            id: genId(),
            userId: user._id,
            creationId: '',
            creationDate: now.epoch,
            userName: 'SAGE',
            query: prompt,
            response: 'Working on it...',
          };
          updateState(props._id, { ...s, messages: [...s.messages, initialAnswer] });

          // Build the query
          const q: WebQuery = {
            ctx: {
              previousQ: previousQuestion,
              previousA: previousAnswer,
              pos: [props.data.position.x + props.data.size.width + 20, props.data.position.y],
              roomId,
              boardId,
            },
            q: prompt,
            url: apps[0].data.state.webviewurl,
            user: username,
            model: selectedModel || 'llama',
            extras: prompt.includes('pdf') ? 'pdfs' : prompt.includes('images') ? 'images' : prompt.includes('links') ? 'links' : 'text',
          };
          setProcessing(true);
          setActions([]);
          // Invoke the agent
          const response = await callWeb(q);
          setProcessing(false);

          if ('message' in response) {
            toast({
              title: 'Error',
              description: response.message || 'Error sending query to the agent. Please try again.',
              status: 'error',
              duration: 4000,
              isClosable: true,
            });
          } else {
            // Clear the stream text
            setStreamText('');
            ctrlRef.current = null;
            setPreviousAnswer(response.r);
            // Add messages
            updateState(props._id, {
              ...s,
              previousQ: 'Describe the content',
              previousA: response.r,
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
                  response: response.r,
                },
              ],
            });
            if (response.actions) {
              setActions(response.actions);
            }
          }
        }
      }
    }
  };

  // Generic code to handle the map content
  const onContentMap = async (prompt: string) => {
    if (!user) return;
    if (sourceApps.length > 0) {
      // Update the context with the stickies
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));

      // Check for map
      if (apps && apps[0].data.type === 'Map') {
        if (roomId && boardId) {
          const now = await serverTime();
          const initialAnswer = {
            id: genId(),
            userId: user._id,
            creationId: '',
            creationDate: now.epoch,
            userName: 'SAGE',
            query: prompt,
            response: 'Working on it...',
          };
          updateState(props._id, { ...s, messages: [...s.messages, initialAnswer] });

          const request = prompt.slice(2);
          console.log('Map request', request);
          console.log('GeoJSON', apps[0].data.state);
          let ctx = '';
          const layers = apps[0].data.state.layers || [];
          if (layers.length > 0) {
            const visibleLayers = layers.filter((l: any) => l.visible).map((l: any) => l.assetId);
            if (visibleLayers.length === 0) {
              toast({
                title: 'No visible layers',
                description: 'Please select a layer to query.',
                status: 'warning',
                duration: 4000,
                isClosable: true,
              });
              return;
            }
            const myasset = useAssetStore.getState().assets.find((a) => a._id === visibleLayers[0]);
            if (myasset && isGeoJSON(myasset.data.mimetype)) {
              const newURL = apiUrls.assets.getAssetById(myasset.data.file);
              // Get the GEOJSON data from the asset
              const response = await fetch(newURL, {
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                },
              });
              const geojson = await response.json();

              ctx = `Please read the following GeoJSON data:
                <text>
                ${JSON.stringify(geojson, null, 2)}
                </text>
                ${request}`;
            }
          } else {
            ctx = `Please check the following map centered on the coordinates:
              <data>
              Lng ${apps[0].data.state.location[0]}, Lat ${apps[0].data.state.location[1]}
              </data>
              ${request}`;
          }

          // Build the query
          const q: AskRequest = {
            ctx: {
              previousQ: previousQuestion,
              previousA: previousAnswer,
              pos: [props.data.position.x + props.data.size.width + 20, props.data.position.y],
              roomId,
              boardId,
            },

            user: username,
            id: genId(),
            model: selectedModel || 'llama',
            location: location,
            q: s.context ? ctx : request,
          };
          setProcessing(true);
          setActions([]);
          // Invoke the agent
          const response = await callAsk(q);
          setProcessing(false);

          if ('message' in response) {
            toast({
              title: 'Error',
              description: response.message || 'Error sending query to the agent. Please try again.',
              status: 'error',
              duration: 4000,
              isClosable: true,
            });
          } else {
            // Clear the stream text
            setStreamText('');
            ctrlRef.current = null;
            setPreviousAnswer(response.r);
            // Add messages
            updateState(props._id, {
              ...s,
              previousQ: 'Describe the content',
              previousA: response.r,
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
                  response: response.r,
                },
              ],
            });
            if (response.actions) {
              setActions(response.actions);
            }
          }
        }
      }
    }
  };

  // Get a screenshot of the web content
  const onContentWebScreenshot = async () => {
    if (!user) return;
    if (sourceApps.length > 0) {
      // Update the context with the stickies
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));

      // Check for image
      if (apps && apps[0].data.type === 'Webview') {
        if (roomId && boardId) {
          const now = await serverTime();
          const initialAnswer = {
            id: genId(),
            userId: user._id,
            creationId: '',
            creationDate: now.epoch,
            userName: 'SAGE',
            query: prompt,
            response: 'Working on it...',
          };
          updateState(props._id, { ...s, messages: [...s.messages, initialAnswer] });

          // Build the query
          const q: WebScreenshot = {
            ctx: {
              previousQ: previousQuestion,
              previousA: previousAnswer,
              pos: [props.data.position.x + props.data.size.width + 20, props.data.position.y],
              roomId,
              boardId,
            },
            url: apps[0].data.state.webviewurl,
            user: username,
          };
          setProcessing(true);
          setActions([]);
          // Invoke the agent
          const response = await callWebshot(q);
          setProcessing(false);

          if ('message' in response) {
            toast({
              title: 'Error',
              description: response.message || 'Error sending query to the agent. Please try again.',
              status: 'error',
              duration: 4000,
              isClosable: true,
            });
          } else {
            // Clear the stream text
            setStreamText('');
            ctrlRef.current = null;
            setPreviousAnswer(response.r);
            // Add messages
            updateState(props._id, {
              ...s,
              previousQ: 'Describe the content',
              previousA: response.r,
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
                  response: response.r,
                },
              ],
            });
            if (response.actions) {
              setActions(response.actions);
            }
          }
        }
      }
    }
  };

  // Array of prompts for Web content
  const webPrompts = [
    { title: 'Web Summary', action: onContentWeb, prompt: 'Summarize concisely this webpage.' },
    { title: 'Find Links', action: onContentWeb, prompt: 'What are the main links that I should read to expand on the subject matter.' },
    { title: 'Find PDF', action: onContentWeb, prompt: 'Find the PDF in the page.' },
    {
      title: 'Generate Keywords',
      action: onContentWeb,
      prompt: 'Return a list of 3-5 keywords that best capture the essence and subject matter of the text.',
    },
    { title: 'Find Facts', action: onContentWeb, prompt: 'Provide a list of two or three interesting facts from the text.' },
    { title: 'Screenshot', action: onContentWebScreenshot, prompt: 'Take a screenshot' },
  ];

  // Code section
  const onContentCode = async (prompt: string, method: string) => {
    if (!user) return;
    // Get server time
    const now = await serverTime();
    // Is it a question to SAGE?
    const isQuestion = prompt.toUpperCase().startsWith('@S');
    const name = isQuestion ? 'SAGE' : user?.data.name;
    // Add messages
    const initialAnswer = {
      id: genId(),
      userId: user._id,
      creationId: '',
      creationDate: now.epoch,
      userName: name,
      query: prompt,
      response: isQuestion ? 'Working on it...' : '',
    };
    updateState(props._id, { ...s, messages: [...s.messages, initialAnswer] });
    if (isQuestion) {
      setProcessing(true);
      // Remove the @S from the question
      const request = isQuestion ? prompt.slice(2) : prompt;

      if (isQuestion) {
        const body: CodeRequest = {
          ctx: {
            previousQ: previousQuestion,
            previousA: previousAnswer,
            pos: [props.data.position.x + props.data.size.width + 20, props.data.position.y],
            roomId: roomId!,
            boardId: boardId!,
          },
          user: username,
          id: genId(),
          model: selectedModel || 'llama',
          location: location,
          q: request,
          method: method,
        };
        const response = await callCode(body);
        if ('message' in response) {
          toast({
            title: 'Error',
            description: response.message || 'Error sending query to the agent. Please try again.',
            status: 'error',
            duration: 4000,
            isClosable: true,
          });
        } else {
          const new_text = response.r || '';
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
          if (response.actions) {
            setActions(response.actions);
          }
        }
      }
    }
  };

  const onProsCons = async () => {
    if (s.context) {
      // ProsCons prompt
      const ctx = `@S, Please carefully read the following document text:
        <document>
        ${s.context}
        </document>
        After reading through the document, identify the pros and cons.
        Provide all your answers in a few sentences.`;
      newMessage(ctx);
      setInput('');
    }
  };
  const onKeywords = async () => {
    if (s.context) {
      // Keywords prompt
      const ctx = `@S, Please carefully read the following document text:
        <document>
        ${s.context}
        </document>
        Extract 3-5 keywords that best capture the essence and subject matter of the document. These keywords should concisely represent the most important and central ideas conveyed by the text.
        Provide all your answers using a list.`;
      newMessage(ctx);
      setInput('');
    }
  };
  const onOpinion = async () => {
    if (s.context) {
      // Opinion prompt
      const ctx = `@S, Please carefully read the following document text:
        <document>
        ${s.context}
        </document>
        Provide a short opinion on the document.`;
      newMessage(ctx);
      setInput('');
    }
  };
  const onFacts = async () => {
    if (s.context) {
      // Facts prompt
      const ctx = `@S, Please carefully read the following document text:
        <document>
        ${s.context}
        </document>
        List two or three interesting facts from the document.`;
      newMessage(ctx);
      setInput('');
    }
  };

  /*
    Chat with Paper:
      Explain Abstract of this paper
      Conclusions from the paper
      Results of the paper
      Methods used in this paper
      Summarise introduction of this paper
      What are the contributions of this paper
      Explain the practical implications of this paper
      Limitations of this paper
      Literature survey of this paper
      What data has been used in this paper
      Future works suggested in this paper
      Find Related Papers
 */
  // Array of prompts for PDFs
  const pdfPrompts = [
    {
      title: 'Generate Summary',
      action: onContentPDF,
      prompt:
        'Provide a summary of the main findings and conclusions of these papers, including the research question, methods used, and key results.',
    },
    {
      title: 'Gaps and Limitations',
      action: onContentPDF,
      prompt:
        'What limitations or gaps does these papers identify in their own studies or in the broader field of research? How do the authors suggest overcoming these issues in future research?.',
    },
    {
      title: 'Literature and References',
      action: onContentPDF,
      prompt:
        'What are the key references and theoretical frameworks that these papers builds upon? Summarize how these studies contributes to existing research in the field.',
    },
    {
      title: 'Methodology Analysis',
      action: onContentPDF,
      prompt:
        'Describe the research methodology used in these papers. What were the sample size, experimental design, data collection methods, and statistical analyses applied used.',
    },
    {
      title: 'Explain implications',
      action: onContentPDF,
      prompt:
        'What are the practical and theoretical implications of these studies findings? How might they influence future research, trends, or real-world applications in the field?.',
    },
  ];

  const onCodeComment = async () => {
    if (!user) return;
    // Get the current context
    let newctx = s.context;
    if (!newctx && sourceApps.length > 0) {
      // Update the context with the stickies
      let language = 'python';
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));
      newctx = apps.reduce((accumulate, app) => {
        if (app.data.type === 'CodeEditor') {
          accumulate += app.data.state.content + '\n\n';
          language = app.data.state.language;
        }
        return accumulate;
      }, '');
      newctx = `Language ${language}:\n\n${newctx}`;
    }
    if (newctx) {
      // Summary prompt
      const ctx = `@S, Please carefully read the following code:
        <code>
        ${newctx}
        </code>
        Comment this code extensively to explain clearly what each instruction is supposed to do`;
      onContentCode(ctx, 'comment');
      setInput('');
    }
  };
  const onCodeExplain = async () => {
    if (!user) return;
    // Get the current context
    let newctx = s.context;
    if (!newctx && sourceApps.length > 0) {
      // Update the context with the stickies
      let language = 'python';
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));
      newctx = apps.reduce((accumulate, app) => {
        if (app.data.type === 'CodeEditor') {
          accumulate += app.data.state.content + '\n\n';
          language = app.data.state.language;
        }
        return accumulate;
      }, '');
      newctx = `Language ${language}:\n\n${newctx}`;
    }
    if (newctx) {
      // Summary prompt
      const ctx = `@S, Please carefully read the following code:
        <code>
        ${newctx}
        </code>
        Explain this code`;
      onContentCode(ctx, 'explain');
      setInput('');
    }
  };
  const onCodeGenerate = async () => {
    if (!user) return;
    // Get the current context
    let newctx = s.context;
    if (sourceApps.length > 0) {
      // Update the context with the stickies
      let language = 'python';
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));
      newctx = apps.reduce((accumulate, app) => {
        if (app.data.type === 'CodeEditor') {
          accumulate += app.data.state.content + '\n\n';
          language = app.data.state.language;
        }
        return accumulate;
      }, '');
      newctx = `Generate the best solution in ${language} code according to the following prompt: ${newctx}`;
    }
    if (newctx) {
      // Summary prompt
      const ctx = `@S, Generate the best solution according to the following prompt: ${newctx}`;
      onContentCode(ctx, 'refactor');
      setInput('');
    }
  };

  const onCodeRefactor = async () => {
    if (!user) return;
    // Get the current context
    let newctx = s.context;
    if (!newctx && sourceApps.length > 0) {
      // Update the context with the stickies
      let language = 'python';
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));
      newctx = apps.reduce((accumulate, app) => {
        if (app.data.type === 'CodeEditor') {
          accumulate += app.data.state.content + '\n\n';
          language = app.data.state.language;
        }
        return accumulate;
      }, '');
      newctx = `Language ${language}:\n\n${newctx}`;
    }
    if (newctx) {
      // Summary prompt
      const ctx = `@S, Please carefully read the following code:
        <code>
        ${newctx}
        </code>
        Can you refactor this code`;
      onContentCode(ctx, 'refactor');
      setInput('');
    }
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

  useEffect(() => {
    if (settings.aiModel) {
      setSelectedModel(settings.aiModel);
    }
  }, [settings.aiModel]);

  // Wait for new messages to scroll to the bottom
  useEffect(() => {
    if (!processing && !scrolled) {
      // Scroll to bottom of chat box smoothly
      goToBottom();
    }
    if (scrolled) setNewMessages(true);
  }, [s.messages]);

  const applyAction = (action: any) => async () => {
    // Test JSON data
    if (action.type === 'create_app') {
      // Create a new duplicate app
      const type = action.app as AppName;
      const size = action.data.size;
      const pos = action.data.position;
      const state = action.state;
      // Create the app
      const res = await createApp({
        title: type,
        roomId: roomId!,
        boardId: boardId!,
        position: pos,
        size: size,
        rotation: { x: 0, y: 0, z: 0 },
        type: type,
        state: { ...(initialValues[type] as AppState), ...state },
        raised: true,
        dragging: false,
        pinned: false,
      });
      if (res.success === true) {
        const sourceId = props._id;
        const targetId = res.data._id;
        addLink(sourceId, targetId, props.data.boardId, 'provenance');
      }
      toast({
        title: 'Info',
        description: 'Action applied.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      addLink;
    } else {
      console.log('Action> not valid');
    }
  };

  return (
    <AppWindow app={props} hideBackgroundIcon={MdChat}>
      <Flex gap={2} p={2} minHeight={'max-content'} direction={'column'} h="100%" w="100%" background={backgroundColorHex}>
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
              WebkitBoxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)',
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

            // Remove single backticks and replace with double asterisks for bold
            const response = message.response.replace(/`([^`\n]+)`/g, (match, p1) => {
              return `**${p1}**`;
            });

            return (
              <Fragment key={index}>
                {/* Start of User Messages */}
                {message.query && message.query.length ? (
                  <Box position="relative" my={1}>
                    {isMe ? (
                      <Box top="-15px" right={'15px'} position={'absolute'} textAlign={'right'}>
                        <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                          Me - {time}
                        </Text>
                      </Box>
                    ) : (
                      <Box top="-15px" left={'15px'} position={'absolute'} textAlign={'right'}>
                        <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                          {message.userName} - {time}
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
                        // label={time}
                        label={'Drag to board - Double-click to clipboard'}
                        openDelay={400}
                        closeDelay={2000}
                      >
                        <Box
                          color="black"
                          rounded={'md'}
                          boxShadow="md"
                          fontFamily="Arial"
                          textAlign={isMe ? 'right' : 'left'}
                          bg={isMe ? myColor : otherUserColor}
                          px={2}
                          py={1}
                          m={3}
                          maxWidth="70%"
                          userSelect={isFocused ? 'text' : 'none'}
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
                          draggable={!isFocused}
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
                                sources: [props._id],
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
                {message.response && message.response.length ? (
                  <Box position="relative" my={1} maxWidth={'70%'}>
                    <Box top="0" left={'15px'} position={'absolute'} textAlign="left">
                      <Text whiteSpace={'nowrap'} textOverflow="ellipsis" fontWeight="bold" color={textColor} fontSize="md">
                        {message.userName} - {time}
                      </Text>
                    </Box>

                    <Box display={'flex'} justifyContent="left" position={'relative'} top={'15px'} mb={'15px'}>
                      <Tooltip
                        whiteSpace={'nowrap'}
                        textOverflow="ellipsis"
                        fontSize={'xs'}
                        placement="top"
                        hasArrow={true}
                        label={'Drag to board - Double-click to clipboard'}
                        openDelay={400}
                        closeDelay={2000}
                      >
                        <Box
                          boxShadow="md"
                          color="black"
                          rounded={'md'}
                          textAlign={'left'}
                          bg={sageColor}
                          px={2}
                          py={1}
                          m={3}
                          fontFamily="Arial"
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
                            // pl={3}
                            draggable={!isFocused}
                            onDragStart={(e) => {
                              // Store the response into the drag/drop events to create stickies
                              e.dataTransfer.clearData();
                              e.dataTransfer.setData('app', 'Stickie');
                              e.dataTransfer.setData(
                                'app_state',
                                JSON.stringify({
                                  color: 'purple',
                                  text: message.response.trim(),
                                  fontSize: 24,
                                  sources: [props._id],
                                })
                              );
                            }}
                          >
                            <Box>
                              <Markdown
                                options={{
                                  overrides: {
                                    ol: {
                                      component: MdOrderedList,
                                    },
                                    ul: {
                                      component: MdUnorderedList,
                                    },
                                    code: {
                                      component: MdCode,
                                    },
                                  },
                                }}
                                style={{ userSelect: isFocused ? 'text' : 'none' }}
                              >
                                {response}
                              </Markdown>
                            </Box>
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
                <Box boxShadow="md" color="white" rounded={'md'} textAlign={'left'} bg={aiTypingColor} p={1} m={3} fontFamily="Arial">
                  {streamText}
                </Box>
              </Box>
            </Box>
          )}

          <Box display={'flex'} justifyContent={'left'}>
            {actions && (
              <List>
                {actions.map((action, index) => {
                  let propName = undefined;
                  let chartType = undefined;
                  try {
                    propName = action.state.widget.yAxisNames[0];
                    chartType = action.state.widget.visualizationType;
                  } catch (e) {
                    // console.log('ChatApp Exception> No property Name found.');
                  }
                  return (
                    <Box
                      color="black"
                      rounded={'md'}
                      boxShadow="md"
                      fontFamily="Arial"
                      textAlign={'left'}
                      bg={textColor}
                      p={1}
                      m={3}
                      userSelect={'none'}
                      _hover={{ background: 'purple.300' }}
                      background={'purple.200'}
                      onClick={applyAction(action)}
                      key={'list-' + index}
                    >
                      <Tooltip label="Click to show result on the board" aria-label="A tooltip">
                        <ListItem key={index}>
                          <ListIcon as={MdOpenInNew} color="white" fontWeight={'bold'} />
                          {chartType === 'map' ? 'Show Map' : 'Show ' + (propName || action.app)} on the board
                        </ListItem>
                      </Tooltip>
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>
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
          <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Stop'} openDelay={400}>
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
          <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Settings'} openDelay={400}>
            <IconButton
              aria-label="reset"
              size={'xs'}
              p={0}
              m={0}
              colorScheme={'blue'}
              variant="ghost"
              icon={<MdSettings size="24px" />}
              onClick={editSettingsOnOpen}
              width="33%"
            />
          </Tooltip>
        </HStack>

        {mode !== 'chat' && <hr />}

        {mode === 'Hawaii Mesonet' && (
          <HStack>
            {mesonetPrompts.map((p, i) => (
              <Tooltip key={'tip' + i} fontSize={'xs'} placement="top" hasArrow={true} label={p.prompt} openDelay={400}>
                <Button
                  key={'button' + i}
                  aria-label="stop"
                  size={'xs'}
                  p={0}
                  m={0}
                  colorScheme={'blue'}
                  variant="ghost"
                  textAlign={'left'}
                  onClick={() => p.action()}
                  width="34%"
                >
                  <HiCommandLine fontSize={'24px'} />
                  <Text key={'text' + i} ml={'2'}>
                    {p.title}
                  </Text>
                </Button>
              </Tooltip>
            ))}
          </HStack>
        )}

        {/* AI Prompts */}
        {mode === 'text' && (
          <HStack>
            <Tooltip
              fontSize={'xs'}
              placement="top"
              hasArrow={true}
              label={'Identify the main topics, themes, and key concepts that are covered in the text'}
              openDelay={400}
            >
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onSummary}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Generate Summary</Text>
              </Button>
            </Tooltip>
            <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Identify the pros and cons of the text'} openDelay={400}>
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onProsCons}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Give feedback</Text>
              </Button>
            </Tooltip>
            <Tooltip
              fontSize={'xs'}
              placement="top"
              hasArrow={true}
              label={'Extract 3-5 keywords that best capture the essence and subject matter of the text'}
              openDelay={400}
            >
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onKeywords}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Generate Keywords</Text>
              </Button>
            </Tooltip>
            <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Provide a short opinion on the text'} openDelay={400}>
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onOpinion}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Provide Opinion</Text>
              </Button>
            </Tooltip>
            <Tooltip
              fontSize={'xs'}
              placement="top"
              hasArrow={true}
              label={'Provide two or three interesting facts from the text'}
              openDelay={400}
            >
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onFacts}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Find Facts</Text>
              </Button>
            </Tooltip>
          </HStack>
        )}

        {mode === 'code' && (
          <HStack>
            <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Refactor the code'} openDelay={400}>
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onCodeRefactor}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Refactor Code</Text>
              </Button>
            </Tooltip>
            <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Explain the code'} openDelay={400}>
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onCodeExplain}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Explain Code</Text>
              </Button>
            </Tooltip>
            <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Comment the code'} openDelay={400}>
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onCodeComment}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Comment Code</Text>
              </Button>
            </Tooltip>
            <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Generate some code'} openDelay={400}>
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onCodeGenerate}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Generate Code</Text>
              </Button>
            </Tooltip>
          </HStack>
        )}

        {mode === 'image' && (
          <HStack>
            <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Describe the image in details'} openDelay={400}>
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onImageSummary}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Describe Image</Text>
              </Button>
            </Tooltip>
            <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Generate a caption for the image'} openDelay={400}>
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onImageCaption}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Generate Caption</Text>
              </Button>
            </Tooltip>
            <Tooltip
              fontSize={'xs'}
              placement="top"
              hasArrow={true}
              label={'Describe the good parts and then the bad parts of the image'}
              openDelay={400}
            >
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onImageProsCons}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Give Feedback</Text>
              </Button>
            </Tooltip>
            <Tooltip
              fontSize={'xs'}
              placement="top"
              hasArrow={true}
              label={'Generate 3-5 keywords that best capture the essence and subject matter of the image'}
              openDelay={400}
            >
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onImageKeywords}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Generate Keywords</Text>
              </Button>
            </Tooltip>
            <Tooltip
              fontSize={'xs'}
              placement="top"
              hasArrow={true}
              label={'Provide two or three interesting facts about the image'}
              openDelay={400}
            >
              <Button
                aria-label="stop"
                size={'xs'}
                p={0}
                m={0}
                colorScheme={'blue'}
                variant="ghost"
                textAlign={'left'}
                onClick={onImageFacts}
                width="34%"
              >
                <HiCommandLine fontSize={'24px'} />
                <Text ml={'2'}>Find Facts</Text>
              </Button>
            </Tooltip>
          </HStack>
        )}
        {mode === 'pdf' && (
          // Generate the prompt and buttons for the PDFs
          <HStack>
            {pdfPrompts.map((p, i) => (
              <Tooltip key={'tip' + i} fontSize={'xs'} placement="top" hasArrow={true} label={p.prompt} openDelay={400}>
                <Button
                  key={'button' + i}
                  aria-label="stop"
                  size={'xs'}
                  p={0}
                  m={0}
                  colorScheme={'blue'}
                  variant="ghost"
                  textAlign={'left'}
                  onClick={() => p.action('@S ' + p.prompt)}
                  width="34%"
                >
                  <HiCommandLine fontSize={'24px'} />
                  <Text key={'text' + i} ml={'2'}>
                    {p.title}
                  </Text>
                </Button>
              </Tooltip>
            ))}
          </HStack>
        )}
        {mode === 'web' && (
          // Generate the prompt and buttons for the Webviews
          <HStack>
            {webPrompts.map((p, i) => (
              <Tooltip key={'tip' + i} fontSize={'xs'} placement="top" hasArrow={true} label={p.prompt} openDelay={400}>
                <Button
                  key={'button' + i}
                  aria-label="stop"
                  size={'xs'}
                  p={0}
                  m={0}
                  colorScheme={'blue'}
                  variant="ghost"
                  textAlign={'left'}
                  onClick={() => p.action('@S ' + p.prompt)}
                  width="34%"
                >
                  <HiCommandLine fontSize={'24px'} />
                  <Text key={'text' + i} ml={'2'}>
                    {p.title}
                  </Text>
                </Button>
              </Tooltip>
            ))}
          </HStack>
        )}

        {/* Input Text */}
        <InputGroup bg={'blackAlpha.100'} maxHeight={'120px'}>
          <Textarea
            placeholder={'Chat with friends or ask SAGE with @S' + (selectedModel ? ' (' + selectedModel + ' model)' : '')}
            size="md"
            variant="outline"
            _placeholder={{ color: 'inherit' }}
            onChange={handleChange}
            onKeyDown={onSubmit}
            value={input}
            ref={inputRef}
            resize="none"
          />
          <InputRightElement onClick={sendMessage} mr={3}>
            <MdSend color="green.500" />
          </InputRightElement>
        </InputGroup>

        <Box bg={'blackAlpha.100'} rounded={'sm'} p={1} m={0}>
          <Text width="100%" align="center" whiteSpace={'nowrap'} textOverflow="ellipsis" color={fgColor} fontSize="xs">
            {status}
          </Text>
        </Box>

        {/* Intelligence settings */}
        <EditUserSettingsModal isOpen={editSettingsIsOpen} onClose={editSettingsOnClose} tab={'intelligence'} />
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
  // const date = new Date(epoch).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  const time = new Date(epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  // return `${date} - ${time}`;
  return `${time}`;
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import {
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
  List,
  ListIcon,
  ListItem,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react';
import { MdSend, MdExpandCircleDown, MdStopCircle, MdChangeCircle, MdChat, MdSettings, MdOpenInNew } from 'react-icons/md';

import { AppName } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import {
  useAppStore,
  useHexColor,
  useUser,
  serverTime,
  useUsersStore,
  useUserSettings,
  useUIStore,
  EditUserSettingsModal,
  useLinkStore,
  useAssetStore,
  apiUrls,
  useConfigStore,
  seerImage,
  dataURLtoBlob,
  withUserProvider,
} from '@sage3/frontend';
import { genId, AskRequest, ImageQuery, PDFQuery, CodeRequest, WebQuery, WebScreenshot, isGeoJSON } from '@sage3/shared';
import { LLMConfigManager, TaskType } from '@sage3/shared/types';

import { App } from '../../schema';
import { state as AppState, init as initialState } from './index';
import { AppWindow } from '../../components';

import { callImage, callPDF, callAsk, callCode, callWeb, callWebshot, callMesonet } from './tRPC';
import { OperationMode, MODE_TASK, MAX_IMAGES, MAX_PDFS } from './constants';
import { parseCommand, commandHelp, ParsedCommand } from './commands';
import { ToolbarComponent, GroupedToolbarComponent } from './Toolbar';
import { MessageItem } from './MessageItem';
import { PromptBars } from './PromptBars';

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
  const sageColor = '#bec6dc';
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

  // AI capability config (no secrets) used to gate requests by capability.
  // Built from the server config; the manager mirrors the backend's matching.
  const serverConfig = useConfigStore((state) => state.config);
  const llmManager = useMemo(
    // Include the user's own provider so its capabilities gate tasks like any other
    () => (serverConfig?.models ? new LLMConfigManager(withUserProvider(serverConfig.models)) : undefined),
    [serverConfig]
  );

  // Input text for query
  const [input, setInput] = useState<string>('');
  const [streamText, setStreamText] = useState<string>('');
  // Element to set the focus to when opening the dialog
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Processing
  const [processing, setProcessing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [newMessages, setNewMessages] = useState(false);

  const [previousQuestion, setPreviousQuestion] = useState(s.previousQ);
  const [previousAnswer, setPreviousAnswer] = useState(s.previousA);
  const [status] = useState<string>('AI can make mistakes. User caution is advised.');
  const [actions, setActions] = useState<any[]>([]);
  const [mode, setMode] = useState<OperationMode>('chat');
  const [location, setLocation] = useState('');

  const isSelected = useUIStore.getState().selectedAppId === props._id;
  const chatBox = useRef<null | HTMLDivElement>(null);
  const ctrlRef = useRef<null | AbortController>(null);

  // Display some notifications
  const toast = useToast();

  // Capability gate: verify the selected provider can perform `task` before we
  // send the request to the backend. Returns true when allowed; otherwise warns
  // the user and returns false so the caller can abort.
  const canPerform = (task: TaskType): boolean => {
    const provider = selectedModel;
    // No capability info or no provider selected yet: don't block
    if (!llmManager || !provider) return true;
    if (llmManager.canProviderPerformTask(provider, task)) return true;
    toast({
      title: 'Model not capable',
      description: `The selected model "${provider}" can't handle ${task.replace('_', ' ')} requests. Pick a different model in Settings (gear icon).`,
      status: 'warning',
      duration: 6000,
      isClosable: true,
    });
    return false;
  };

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

  /**
   * Run a slash command. Commands act for the person who typed them: their
   * results go to a toast or to the board, not into the shared transcript.
   */
  const runCommand = async (parsed: ParsedCommand) => {
    const { command, args } = parsed;

    if (command.name === '/help') {
      toast({ title: 'Chat commands', description: commandHelp(), status: 'info', duration: 8000, isClosable: true });
      return;
    }

    if (command.name === '/image') {
      if (!args) {
        toast({
          title: 'Describe the image',
          description: command.usage,
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
        return;
      }
      // canPerform reports an uncapable model; generateImage re-checks too
      if (command.task && !canPerform(command.task)) return;
      await generateImage(args, args);
      return;
    }
  };

  const sendMessage = async () => {
    const text = input.trim();

    // Slash commands are handled locally and never posted to the shared
    // transcript: their output is feedback for the person who typed them, not
    // part of the conversation everyone sees.
    const parsed = parseCommand(text);
    if (parsed === 'unknown') {
      toast({
        title: `Unknown command "${text.split(/\s+/)[0]}"`,
        description: commandHelp(),
        status: 'warning',
        duration: 6000,
        isClosable: true,
      });
      return;
    }
    if (parsed) {
      setInput('');
      await runCommand(parsed);
      return;
    }

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
        },
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
      setPreviousQuestion((prevItems) => [...prevItems, s.firstQuestion]);
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

  // Handle a chat-box submission: a peer message (posted as-is) or an @S
  // question to SAGE (sent via runAsk, with linked apps passed as appIds).
  const newMessage = async (new_input: string) => {
    if (!user) return;
    const isQuestion = new_input.toUpperCase().startsWith('@S');
    if (!isQuestion) {
      // Peer chat message — just post it to the transcript
      const now = await serverTime();
      updateState(props._id, {
        ...s,
        messages: [
          ...s.messages,
          {
            id: genId(),
            userId: user._id,
            creationId: '',
            creationDate: now.epoch,
            userName: user?.data.name,
            query: new_input,
            response: '',
          },
        ],
      });
      return;
    }
    // Question to SAGE — let the backend read linked apps' content from appIds;
    // fall back to s.context only when there are no linked apps.
    const request = new_input.slice(2);
    const common = {
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
    };
    let body: AskRequest;
    if (sourceApps.length > 0) {
      body = { ...common, q: request, appIds: sourceApps };
    } else if (s.context) {
      body = { ...common, q: `Please carefully read the following text:\n<text>\n${s.context}\n</text>\n${request}` };
    } else {
      body = { ...common, q: request };
    }
    runAsk(body, request);
  };

  const goToBottom = (mode: ScrollBehavior = 'smooth') => {
    // Defer to after layout/paint (two frames) so scrollHeight reflects the
    // freshly-rendered markdown of an incoming answer — otherwise we measure a
    // stale, shorter height and the window stops part-way down.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = chatBox.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: mode });
      });
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
    setPreviousQuestion([]);
    setPreviousAnswer([]);
    updateState(props._id, { ...s, previousA: [], previousQ: [], messages: initialState.messages });
    setProcessing(false);
    setActions([]);
  };

  // Shared: send an Ask request with the optimistic "Working on it..." message,
  // error handling, transcript/state update, and actions. Used by the prompt
  // helpers below (and available for the other senders to adopt).
  const runAsk = async (body: AskRequest, displayQuery: string) => {
    if (!user) return;
    if (!canPerform(MODE_TASK[mode] || 'chat')) return;
    const now = await serverTime();
    // Optimistic "Working on it..." bubble while the agent runs
    const placeholder = {
      id: genId(),
      userId: user._id,
      creationId: '',
      creationDate: now.epoch,
      userName: 'SAGE',
      query: displayQuery,
      response: 'Working on it...',
    };
    updateState(props._id, { ...s, messages: [...s.messages, placeholder] });
    setProcessing(true);
    const response = await callAsk(body);
    setProcessing(false);
    if ('message' in response) {
      toast({
        title: 'Error',
        description: response.message || 'Error sending query to the agent. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    // Append the real answer and record the turn in the transcript/history
    const new_text = response.r || '';
    setStreamText('');
    ctrlRef.current = null;
    setPreviousAnswer((prevItems) => [...prevItems, new_text]);
    updateState(props._id, {
      ...s,
      previousQ: [...s.previousQ, displayQuery],
      previousA: [...s.previousA, new_text],
      messages: [
        ...s.messages,
        placeholder,
        { id: genId(), userId: user._id, creationId: '', creationDate: now.epoch + 1, userName: 'SAGE', query: '', response: new_text },
      ],
    });
    if (response.actions && response.actions.length > 0) setActions(response.actions);
  };

  // Ask SAGE about the linked source apps using a server-side prompt template.
  // The backend reads each app's content from appIds — no client-side extraction
  // or prompt assembly. Falls back to s.context when there are no linked apps.
  const askIntent = (intent: string, label: string, fallbackInstruction: string) => {
    const common = {
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
    };
    let body: AskRequest;
    if (sourceApps.length > 0) {
      body = { ...common, q: label, appIds: sourceApps, intent };
    } else if (s.context) {
      body = {
        ...common,
        q: `Please carefully read the following document:\n<document>\n${s.context}\n</document>\n${fallbackInstruction}`,
      };
    } else {
      return;
    }
    runAsk(body, label);
    setInput('');
  };

  const onSummary = () =>
    askIntent('summary', 'Summarize the document', 'Identify the main topics, themes, and key concepts. Answer in a few sentences.');

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
    // Capability check: image questions require a vision-capable model
    if (!canPerform('image')) return;
    if (sourceApps.length > 0) {
      // Update the context
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));

      // Check for image
      if (apps && apps[0].data.type === 'ImageViewer') {
        if (roomId && boardId) {
          // All linked images, so the model can describe or compare several at once
          const assetids = apps.filter((a) => a.data.type === 'ImageViewer').map((a) => a.data.state.assetid);
          // Too many images overwhelm the vision model: block before posting anything to the transcript
          if (assetids.length > MAX_IMAGES) {
            toast({
              title: 'Too many images',
              description: `You can ask about at most ${MAX_IMAGES} images at once (${assetids.length} selected). Please unlink some and try again.`,
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            return;
          }
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
            assets: assetids,
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
            setPreviousAnswer((prevItems) => [...prevItems, response.r]);
            // Add messages
            updateState(props._id, {
              ...s,
              previousQ: [...s.previousQ, 'Describe the content'],
              previousA: [...s.previousA, response.r],
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
            // If the agent picked specific images (filter/select), select the
            // corresponding ImageViewers on the board.
            if (response.selected && response.selected.length > 0) {
              const matchedAppIds = apps
                .filter((a) => a.data.type === 'ImageViewer' && response.selected!.includes(a.data.state.assetid))
                .map((a) => a._id);
              if (matchedAppIds.length > 0) {
                useUIStore.getState().setSelectedAppsIds(matchedAppIds);
                toast({
                  title: 'Selection',
                  description: `Selected ${matchedAppIds.length} image${matchedAppIds.length > 1 ? 's' : ''} on the board`,
                  status: 'info',
                  duration: 3000,
                  isClosable: true,
                });
              }
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
    // Capability check: Mesonet analysis needs a chat-capable model
    if (!canPerform('chat')) return;
    if (selectedModel == 'llama') {
      toast({
        title: 'Mesonet Feature not available for current model',
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
            setPreviousAnswer((prevItems) => [...prevItems, response.summary]);
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
              previousQ: [...previousQuestion, 'Describe the content'],
              previousA: [...previousAnswer, response.summary],
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

  const onContentPDF = async (prompt: string) => {
    if (!user) return;

    const isQuestion = prompt.toUpperCase().startsWith('@S');
    // Capability check: PDF questions require an embeddings + chat-capable model
    if (isQuestion && !canPerform('pdf_processing')) return;
    const name = isQuestion ? 'SAGE' : user?.data.name;

    if (sourceApps.length > 0) {
      // Update the context
      const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));

      // Only consider linked PDFViewer apps: a Chat can be linked to a mix of
      // app types, so mapping asset ids over all apps would inflate the PDF
      // count and send undefined ids for non-PDF apps.
      const pdfApps = apps.filter((a) => a.data.type === 'PDFViewer');
      if (pdfApps.length > 0) {
        if (roomId && boardId) {
          // Too many PDFs overwhelm the context: block the question before posting anything to the transcript
          const assetids = pdfApps.map((d) => d.data.state.assetid);
          if (isQuestion && assetids.length > MAX_PDFS) {
            toast({
              title: 'Too many PDFs',
              description: `You can ask about at most ${MAX_PDFS} PDFs at once (${assetids.length} selected). Please unlink some and try again.`,
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
            return;
          }
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
              setPreviousAnswer((prevItems) => [...prevItems, errorMessage]);
              updateState(props._id, {
                ...s,
                previousQ: [...s.previousQ, q.q],
                previousA: [...s.previousA, errorMessage],
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
              setPreviousAnswer((prevItems) => [...prevItems, response.r]);
              // Add messages
              updateState(props._id, {
                ...s,
                previousQ: [...s.previousQ, q.q],
                previousA: [...s.previousA, response.r],
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
    // Capability check: web summarization needs a chat-capable model
    if (!canPerform('chat')) return;
    if (sourceApps.length > 0) {
      // Update the context
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
            setPreviousAnswer((prevItems) => [...prevItems, response.r]);
            // Add messages
            updateState(props._id, {
              ...s,
              previousQ: [...s.previousQ, 'Describe the content'],
              previousA: [...s.previousA, response.r],
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
    // Capability check: map questions need a chat-capable model
    if (!canPerform('chat')) return;
    if (sourceApps.length === 0 || !roomId || !boardId) return;
    const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));
    if (!apps[0] || apps[0].data.type !== 'Map') return;

    // Map content is derived (a GeoJSON asset or coordinates), so it's assembled
    // here and passed as the question rather than via appIds.
    const request = prompt.slice(2);
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
        const response = await fetch(newURL, { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } });
        const geojson = await response.json();
        ctx = `Please read the following GeoJSON data:\n<text>\n${JSON.stringify(geojson, null, 2)}\n</text>\n${request}`;
      }
    } else {
      ctx = `Please check the following map centered on the coordinates:\n<data>\nLng ${apps[0].data.state.location[0]}, Lat ${apps[0].data.state.location[1]}\n</data>\n${request}`;
    }

    const body: AskRequest = {
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
      q: ctx || request,
    };
    setActions([]);
    runAsk(body, request);
  };

  // Get a screenshot of the web content
  const onContentWebScreenshot = async () => {
    if (!user) return;
    if (sourceApps.length > 0) {
      // Update the context
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
            setPreviousAnswer((prevItems) => [...prevItems, response.r]);
            // Add messages
            updateState(props._id, {
              ...s,
              previousQ: [...s.previousQ, 'Describe the content'],
              previousA: [...s.previousA, response.r],
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
  // Shared: send a Code request with the optimistic message + response handling.
  const runCode = async (body: CodeRequest, displayQuery: string) => {
    if (!user) return;
    if (!canPerform('coding')) return;
    const now = await serverTime();
    // Optimistic "Working on it..." bubble while the agent runs
    const placeholder = {
      id: genId(),
      userId: user._id,
      creationId: '',
      creationDate: now.epoch,
      userName: 'SAGE',
      query: displayQuery,
      response: 'Working on it...',
    };
    updateState(props._id, { ...s, messages: [...s.messages, placeholder] });
    setProcessing(true);
    const response = await callCode(body);
    setProcessing(false);
    if ('message' in response) {
      toast({
        title: 'Error',
        description: response.message || 'Error sending query to the agent. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    // Append the real answer and record the turn in the transcript/history
    const new_text = response.r || '';
    setStreamText('');
    ctrlRef.current = null;
    setPreviousAnswer((prevItems) => [...prevItems, new_text]);
    updateState(props._id, {
      ...s,
      previousQ: [...s.previousQ, displayQuery],
      previousA: [...s.previousA, new_text],
      messages: [
        ...s.messages,
        placeholder,
        { id: genId(), userId: user._id, creationId: '', creationDate: now.epoch + 1, userName: 'SAGE', query: '', response: new_text },
      ],
    });
    if (response.actions && response.actions.length > 0) setActions(response.actions);
  };

  // Ask SAGE about the linked CodeEditor(s): the backend reads their content
  // from appIds and applies the server-side template for `method`.
  const askCode = (method: string, label: string, fallbackInstruction: string) => {
    const common = {
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
    };
    let body: CodeRequest;
    if (sourceApps.length > 0) {
      body = { ...common, q: label, method, appIds: sourceApps };
    } else if (s.context) {
      body = { ...common, q: `Please carefully read the following code:\n<code>\n${s.context}\n</code>\n${fallbackInstruction}`, method };
    } else {
      return;
    }
    runCode(body, label);
    setInput('');
  };

  // Typed @S question in code mode (from the input box).
  const onContentCode = async (prompt: string, method: string) => {
    if (!user) return;
    const isQuestion = prompt.toUpperCase().startsWith('@S');
    if (!isQuestion) {
      // Peer chat message — just post it
      const now = await serverTime();
      updateState(props._id, {
        ...s,
        messages: [
          ...s.messages,
          {
            id: genId(),
            userId: user._id,
            creationId: '',
            creationDate: now.epoch,
            userName: user?.data.name,
            query: prompt,
            response: '',
          },
        ],
      });
      return;
    }
    if (!canPerform('coding')) return;
    const request = prompt.slice(2);
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
      method,
      appIds: sourceApps,
    };
    runCode(body, request);
  };

  const onProsCons = () => askIntent('proscons', 'Identify pros and cons', 'Identify the pros and cons. Answer in a few sentences.');
  const onKeywords = () =>
    askIntent('keywords', 'Extract keywords', 'Extract 3-5 keywords that best capture the essence and subject matter. Answer as a list.');
  const onFacts = () => askIntent('facts', 'List interesting facts', 'List two or three interesting facts from the document.');

  // Generate an image from the linked text app (e.g. a Stickie): the text is
  // sent to the image-generation endpoint, the result is uploaded as an asset,
  // and an ImageViewer is placed next to the chat window.
  /** The "Generate Image" prompt button: illustrate the linked text. */
  const onImageGeneration = async () => {
    const apps = useAppStore.getState().apps.filter((app) => sourceApps.includes(app._id));
    const textApp = apps.find((a) => typeof (a.data.state as { text?: string }).text === 'string');
    const text = ((textApp?.data.state as { text?: string })?.text ?? s.context ?? '').trim();
    if (!text) {
      toast({
        title: 'No text to illustrate',
        description: 'Link a Stickie with some text first, or type /image <description>.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    await generateImage(text, 'Generate an image from the text');
  };

  /**
   * Generate an image from `text`, used as the prompt as written.
   *
   * Shared by the "Generate Image" prompt button (which illustrates a linked
   * Stickie) and the /image command (where the typed text is the prompt), so
   * both take the same path through generation, upload and window creation.
   */
  const generateImage = async (text: string, label: string) => {
    if (!user || processing) return;
    if (!canPerform('image_generation')) return;
    if (!text) return;
    const [firstLine] = text.split('\n').filter((l) => l.trim());
    const now = await serverTime();
    const placeholder = {
      id: genId(),
      userId: user._id,
      creationId: '',
      creationDate: now.epoch,
      userName: 'SAGE',
      query: label,
      response: 'Working on it...',
    };
    updateState(props._id, { ...s, messages: [...s.messages, placeholder] });
    setProcessing(true);
    try {
      // Generic image generation: the linked text becomes the prompt as-is.
      // The Ideator's image call is not used here — it composes a
      // brainstorming-specific prompt that is only meaningful in SageIdeator.
      const result = await seerImage.generate({
        prompt: text.slice(0, 1000),
        model: selectedModel || '',
      });
      if ('message' in result) throw new Error(result.message);
      // Upload to SAGE3 assets instead of keeping a ~1MB data URL around.
      // Generated images arrive as data URLs; decode them locally rather than
      // fetch()ing, since a fetch of a data: URL is subject to connect-src.
      const blob = result.imageUrl.startsWith('data:')
        ? dataURLtoBlob(result.imageUrl)
        : await fetch(result.imageUrl).then((r) => r.blob());
      const imgFile = new File([blob], `chat-image-${genId()}.png`, { type: 'image/png' });
      const fd = new FormData();
      fd.append('files', imgFile);
      fd.append('room', roomId!);
      const uploadRes = await fetch(apiUrls.assets.upload, { method: 'POST', body: fd, credentials: 'include' });
      if (!uploadRes.ok) throw new Error('Asset upload failed');
      const uploadedIds = (await uploadRes.json()) as string[];
      const assetDbId = uploadedIds[0];
      if (!assetDbId) throw new Error('No asset ID returned from upload');
      await createApp({
        title: (firstLine ?? 'Generated image').slice(0, 60),
        roomId: roomId!,
        boardId: boardId!,
        position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
        size: { width: 512, height: 512, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'ImageViewer',
        state: { assetid: assetDbId },
        raised: true,
        dragging: false,
        pinned: false,
      });
      updateState(props._id, {
        ...s,
        messages: [
          ...s.messages,
          placeholder,
          {
            id: genId(),
            userId: user._id,
            creationId: '',
            creationDate: now.epoch + 1,
            userName: 'SAGE',
            query: '',
            response: 'Image generated from the linked text and placed next to the chat window.',
          },
        ],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Image generation failed', description: msg, status: 'error', duration: 4000, isClosable: true });
    } finally {
      setProcessing(false);
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
  const onCodeComment = () =>
    askCode('comment', 'Comment the code', 'Comment this code extensively to explain clearly what each instruction does.');
  const onCodeExplain = () => askCode('explain', 'Explain the code', 'Explain this code.');
  const onCodeGenerate = () => askCode('generate', 'Generate code', 'Generate the best solution for this code/request.');
  const onCodeRefactor = () => askCode('refactor', 'Refactor the code', 'Refactor this code.');

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
          {sortedMessages.map((message, index) => (
            <MessageItem
              key={index}
              message={message}
              isLast={index === sortedMessages.length - 1}
              user={user}
              users={users}
              appId={props._id}
              isFocused={isFocused}
              myColor={myColor}
              otherUserColor={otherUserColor}
              sageColor={sageColor}
              textColor={textColor}
              bgColor={bgColor}
              toast={toast}
            />
          ))}

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

        <PromptBars
          mode={mode}
          handlers={{
            onSummary,
            onProsCons,
            onKeywords,
            onImageGeneration,
            onFacts,
            onCodeRefactor,
            onCodeExplain,
            onCodeComment,
            onCodeGenerate,
            onImageSummary,
            onImageCaption,
            onImageProsCons,
            onImageKeywords,
            onImageFacts,
            onContentPDF,
            onContentWeb,
            onContentWebScreenshot,
          }}
        />

        {/* Input Text */}
        <InputGroup bg={'blackAlpha.100'} maxHeight={'120px'}>
          <Textarea
            placeholder={'Chat, ask SAGE with @S, or type / for commands' + (selectedModel ? ' (' + selectedModel + ' model)' : '')}
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

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

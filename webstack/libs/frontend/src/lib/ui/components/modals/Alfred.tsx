/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
// Import Chakra UI elements
import {
  Modal,
  ModalOverlay,
  ModalContent,
  InputGroup,
  Input,
  VStack,
  Button,
  Box,
  Divider,
  List,
  useColorMode,
  HStack,
  ListItem,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  UnorderedList,
  useToast,
  InputLeftAddon,
  useColorModeValue,
  Spinner,
  Text,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react';

// Icons for file types
import { IoSparklesSharp } from 'react-icons/io5';
import {
  MdOutlinePictureAsPdf,
  MdOutlineImage,
  MdOutlineFilePresent,
  MdOndemandVideo,
  MdOutlineStickyNote2,
  MdInfoOutline,
  MdSettings,
  MdMic,
  MdOpenInNew,
  MdStop,
} from 'react-icons/md';
import { v5 as uuidv5 } from 'uuid';
import Markdown from 'markdown-to-jsx';

import {
  processContentURL,
  useAppStore,
  useUIStore,
  useUser,
  useCursorBoardPosition,
  useAssetStore,
  useUsersStore,
  useConfigStore,
  useThrottleApps,
  useInsightStore,
  setupAppForFile,
  downloadFile,
  apiUrls,
  useUserSettings,
  EditUserSettingsModal,
} from '@sage3/frontend';

import { AppName, AppState } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import { Applications } from '@sage3/applications/apps';
import { AlfredRequest, AlfredResponse, SError, getExtension } from '@sage3/shared';
import { FileEntry } from '@sage3/shared/types';

type props = {
  boardId: string;
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
};

const MaxElements = 12;
let recognition: any = null;

export function Alfred(props: props) {
  // Configuration information
  const config = useConfigStore((state) => state.config);

  // User Settings
  const { toggleShowUI } = useUserSettings();

  // chakra color mode
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();

  // Apps
  const apps = useThrottleApps(250);
  const createApp = useAppStore((state) => state.create);
  const deleteApp = useAppStore((state) => state.delete);
  const setSelectedApps = useUIStore((state) => state.setSelectedAppsIds);
  const fitApps = useUIStore((state) => state.fitApps);

  // User
  const { user, accessId } = useUser();
  const { getBoardCursor } = useCursorBoardPosition();
  const [, setUsername] = useState('');

  useEffect(() => {
    if (user) {
      // User name
      const u = user.data.name;
      const firstName = u.split(' ')[0];
      setUsername(firstName);
    }
  }, [user]);

  // Function to create a new app
  const newApplication = (appName: AppName) => {
    if (!user) return;

    let w = 400;
    let h = 400;

    const state = {} as AppState;
    // Check if the app is enabled in the config
    if (appName === 'SageCell' && config.features && !config.features.apps.includes('SageCell')) return;
    if (appName === 'Screenshare' && config.features && !config.features.apps.includes('Screenshare')) {
      return;
    } else {
      w = 1280;
      h = 720;
      state.accessId = accessId;
    }
    if (appName === 'Calculator') {
      w = 260;
      h = 369;
    }
    if (appName === 'Timer') {
      w = 330;
      h = 226;
    }
    else if (appName === 'Clock') {
      w = 320 * 1.5;
      h = 130 * 1.5;
    }
    // Get around  the center of the board
    const bx = useUIStore.getState().boardPosition.x;
    const by = useUIStore.getState().boardPosition.y;
    const scale = useUIStore.getState().scale;
    const x = Math.floor(-bx + window.innerWidth / scale / 2);
    const y = Math.floor(-by + window.innerHeight / scale / 2);

    createApp({
      title: appName,
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x: x - 200, y: y - 200, z: 0 },
      size: { width: w, height: h, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      state: { ...(initialValues[appName] as AppState), ...state },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  const saveBoard = (name: string) => {
    const selectedapps = useUIStore.getState().savedSelectedAppsIds;
    // Use selected apps if any or all apps
    const apps =
      selectedapps.length > 0 ? useAppStore.getState().apps.filter((a) => selectedapps.includes(a._id)) : useAppStore.getState().apps;
    let filename = name || 'board.s3json';
    if (!filename.endsWith('.s3json')) filename += '.s3json';
    const namespace = useConfigStore.getState().config.namespace;
    const assets = apps.reduce<{ id: string; url: string; filename: string }[]>(function (arr, app) {
      if (app.data.state.assetid) {
        // Generate a public URL of the file
        const token = uuidv5(app.data.state.assetid, namespace);
        const publicURL = apiUrls.assets.getPublicURL(app.data.state.assetid, token);
        const asset = useAssetStore.getState().assets.find((a) => a._id === app.data.state.assetid);
        if (asset) {
          arr.push({ id: app.data.state.assetid, url: window.location.origin + publicURL, filename: asset.data.originalfilename });
        }
      }
      return arr;
    }, []);
    // Data structure to save
    const savedapps = apps.map((app) => {
      // making sure apps have the right state
      return { ...app, data: { ...app.data, state: { ...initialValues[app.data.type], ...app.data.state } } };
    });
    const session = {
      assets: assets,
      apps: savedapps, // apps,
    };
    const payload = JSON.stringify(session, null, 2);
    const jsonurl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(payload);
    // Trigger the download
    downloadFile(jsonurl, filename);
    // Success message
    toast({
      title: 'Board saved',
      description: apps.length + ' apps saved to ' + filename,
      status: 'info',
      duration: 4000,
      isClosable: true,
    });
  };

  // Alfred quick bar response
  const alfredAction = useCallback(
    (term: string) => {
      if (!user) return false;

      // Get the position of the cursor
      const boardCursor = getBoardCursor();
      const cursor = { ...boardCursor, z: 0 };
      const pos = cursor || { x: 100, y: 100, z: 0 };
      const width = 400;
      const height = 420;
      pos.x -= width / 2;
      pos.y -= height / 2;
      // Decompose the search
      const terms = term.split(' ');

      if (terms[0] === 'app') {
        // app shortcuts
        const name = terms[1];
        // Check if it's a valid app name
        if (name in Applications) {
          newApplication(name as AppName);
          return true;
        }
      } else if (terms[0] === 'w' || terms[0] === 'web' || terms[0] === 'webview') {
        if (terms[1]) {
          let loc = terms[1];
          if (!loc.startsWith('http://') && !loc.startsWith('https://')) {
            loc = 'https://' + loc;
          }
          createApp({
            title: loc,
            roomId: props.roomId,
            boardId: props.boardId,
            position: pos,
            size: { width: 400, height: 400, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'WebpageLink',
            state: { ...initialValues['WebpageLink'], url: processContentURL(loc) },
            raised: true,
            dragging: false,
            pinned: false,
          });
          return true;
        }
      } else if (terms[0] === 'g' || terms[0] === 'goo' || terms[0] === 'google') {
        const rest = terms.slice(1).join('+');
        const searchURL = 'https://www.google.com/search?q=' + rest;
        createApp({
          title: searchURL,
          roomId: props.roomId,
          boardId: props.boardId,
          position: pos,
          size: { width: 400, height: 400, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'WebpageLink',
          state: { ...initialValues['WebpageLink'], url: processContentURL(searchURL) },
          raised: true,
          dragging: false,
          pinned: false,
        });
        return true;
      } else if (terms[0] === 's' || terms[0] === 'n' || terms[0] === 'stick' || terms[0] === 'stickie' || terms[0] === 'note') {
        const content = terms.slice(1).join(' ');
        createApp({
          title: user.data.name,
          roomId: props.roomId,
          boardId: props.boardId,
          position: pos,
          size: { width, height, depth: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          type: 'Stickie',
          state: { ...(initialValues['Stickie'] as AppState), text: content },
          raised: true,
          dragging: false,
          pinned: false,
        });
        return true;
      } else if (terms[0] === 'calc' || terms[0] === 'calculator') {
        newApplication('Calculator');
        return true;
      } else if (terms[0] === 'c' || terms[0] === 'cell') {
        newApplication('SageCell');
        return true;
      } else if (terms[0] === 'toggleui') {
        toggleShowUI();
        return true;
      } else if (terms[0] === 'light') {
        if (colorMode !== 'light') toggleColorMode();
        return true;
      } else if (terms[0] === 'dark') {
        if (colorMode !== 'dark') toggleColorMode();
        return true;
      } else if (terms[0] === 'save') {
        saveBoard(terms[1]);
        return true;
      } else if (terms[0] === 'tag') {
        // search apps with tags
        const tags = terms.slice(1);
        const tag = tags[0];
        if (tag) {
          const toSelect: string[] = [];
          useInsightStore.getState().insights.forEach((insight) => {
            if (insight.data.labels && insight.data.labels.includes(tag)) {
              toSelect.push(insight.data.app_id);
            }
          });
          if (toSelect.length > 0) {
            setSelectedApps(toSelect);
            fitApps(apps.filter((a) => toSelect.includes(a._id)));
          }
        }
        return true;
      } else if (terms[0] === 'clear' || terms[0] === 'clearall' || terms[0] === 'closeall') {
        // Batch delete all the apps
        const ids = apps.map((a) => a._id);
        deleteApp(ids);
        return true;
      }

      return false;
    },
    [user, apps, props.boardId, colorMode]
  );

  return (
    <AlfredComponent onAction={alfredAction} roomId={props.roomId} boardId={props.boardId} isOpen={props.isOpen} onClose={props.onClose} />
  );
}

/**
 * Props for the file manager modal behavior
 * from Chakra UI Modal dialog
 */
type AlfredUIProps = {
  onAction: (command: string) => boolean | Promise<boolean>;
  roomId: string;
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * React component to get and display the asset list
 */
function AlfredUI(props: AlfredUIProps): JSX.Element {
  // Element to set the focus to when opening the dialog
  const initialRef = useRef<HTMLInputElement>(null);
  // List of elements
  const listRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<string>();
  const [lastPrompt, setLastPrompt] = useState('');
  const [location, setLocation] = useState('');
  const [response, setResponse] = useState<AlfredResponse | null>(null);
  const [processingAI, setProcessingAI] = useState(false);
  const [previousQuestion, setPreviousQuestion] = useState<string[]>([]);
  const [previousAnswer, setPreviousAnswer] = useState<string[]>([]);

  // Apps
  const createApp = useAppStore((state) => state.create);
  // Assets store
  const assets = useAssetStore((state) => state.assets);
  const [assetsList, setAssetsList] = useState<FileEntry[]>([]);
  const [filteredList, setFilteredList] = useState<FileEntry[]>([]);
  // Access the list of users
  const users = useUsersStore((state) => state.users);
  // check if user is a guest
  const { user } = useUser();
  const { getBoardCursor } = useCursorBoardPosition();
  const { settings } = useUserSettings();
  const [listIndex, setListIndex] = useState(0);
  const [buttonList, setButtonList] = useState<JSX.Element[]>([]);
  // colors
  const intelligenceColor = useColorModeValue('purple.500', 'purple.300');
  const { isOpen: editSettingsIsOpen, onOpen: editSettingsOnOpen, onClose: editSettingsOnClose } = useDisclosure();
  const toast = useToast();
  // Default mic color
  const [recording, setRecording] = useState(false);

  // Select the file when clicked
  const handleChange = (event: React.FormEvent<HTMLInputElement>) => {
    event.preventDefault();
    const val = event.currentTarget.value;
    if (val) {
      // Set the value, trimming spaces at begining and end
      setTerm(val.trim());
    } else {
      setTerm('');
      setListIndex(0);
    }
  };

  useEffect(() => {
    if (user) {
      navigator.geolocation.getCurrentPosition(
        function (coords) {
          setLocation(coords.coords.latitude + ',' + coords.coords.longitude);
        },
        function (e) {
          console.log('Location> error', e);
        }
      );
    }
  }, [user]);

  const resetAIState = useCallback(() => {
    setLastPrompt('');
    setResponse(null);
    setProcessingAI(false);
    setPreviousQuestion([]);
    setPreviousAnswer([]);
  }, []);

  const closeAlfred = useCallback(() => {
    if (recording && recognition) {
      recognition.stop();
      setRecording(false);
    }
    resetAIState();
    setTerm('');
    setListIndex(0);
    if (initialRef.current) {
      initialRef.current.value = '';
    }
    props.onClose();
  }, [props, recording, resetAIState]);

  const submitAIRequest = useCallback(
    async (prompt: string) => {
      if (!user) return;

      const boardCursor = getBoardCursor();
      const cursor = boardCursor || { x: 100, y: 100, z: 0 };
      const body: AlfredRequest = {
        id: window.crypto?.randomUUID?.() || `alfred-${Date.now()}`,
        ctx: {
          previousQ: previousQuestion,
          previousA: previousAnswer,
          pos: [cursor.x, cursor.y, 0],
          roomId: props.roomId,
          boardId: props.boardId,
        },
        q: prompt,
        user: user.data.name,
        location,
        model: settings.aiModel || 'openai',
      };

      setProcessingAI(true);
      setLastPrompt(prompt);
      setResponse(null);
      setTerm('');
      setListIndex(0);
      if (initialRef.current) {
        initialRef.current.value = '';
        initialRef.current.focus();
      }

      try {
        const raw = await fetch(apiUrls.ai.agents.alfred, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await raw.json()) as AlfredResponse | SError;

        if ('message' in data) {
          setResponse({
            id: body.id,
            r: data.message,
            success: false,
            actions: [],
            toolCalls: [],
          });
          return;
        }

        setResponse(data);
        setPreviousQuestion((prev) => [...prev, prompt]);
        setPreviousAnswer((prev) => [...prev, data.r]);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        setResponse({
          id: body.id,
          r: `Error from Alfred AI: ${message}`,
          success: false,
          actions: [],
          toolCalls: [],
        });
      } finally {
        setProcessingAI(false);
      }
    },
    [getBoardCursor, location, previousAnswer, previousQuestion, props.boardId, props.roomId, settings.aiModel, user]
  );

  const normalizeAction = useCallback((action: any) => {
    if (typeof action === 'string') {
      try {
        return JSON.parse(action);
      } catch (e) {
        return null;
      }
    }
    return action;
  }, []);

  const applyAction = useCallback(
    async (action: any) => {
      const normalizedAction = normalizeAction(action);
      if (!normalizedAction || normalizedAction.type !== 'create_app') return;

      const type = normalizedAction.app as AppName;
      const size = normalizedAction.data.size;
      const pos = normalizedAction.data.position;
      const state = normalizedAction.state;

      const res = await createApp({
        title: normalizedAction.data.title || type,
        roomId: props.roomId,
        boardId: props.boardId,
        position: pos,
        size: size,
        rotation: { x: 0, y: 0, z: 0 },
        type: type,
        state: { ...(initialValues[type] as AppState), ...state },
        raised: true,
        dragging: false,
        pinned: false,
      });

      toast({
        title: res?.success ? 'Action applied' : 'Action failed',
        description: res?.success ? `${type} added to the board.` : res?.message || 'Unable to apply action.',
        status: res?.success ? 'success' : 'error',
        duration: 3000,
        isClosable: true,
      });
    },
    [createApp, normalizeAction, props.boardId, props.roomId, toast]
  );

  const applyAllActions = useCallback(async () => {
    if (!response?.actions) return;
    for (const action of response.actions) {
      await applyAction(action);
    }
  }, [applyAction, response?.actions]);

  useEffect(() => {
    if (term) {
      // If something to search
      setFilteredList(
        assetsList.filter((item) => {
          // if term is in the filename
          return (
            // search in the filename
            item.originalfilename.toUpperCase().indexOf(term.toUpperCase()) !== -1 ||
            // search in the type
            item.type.toUpperCase().indexOf(term.toUpperCase()) !== -1 ||
            // search in the owner name
            item.ownerName.toUpperCase().indexOf(term.toUpperCase()) !== -1
          );
        })
      );
    } else {
      // Full list if no search term
      setFilteredList(assetsList);
      setListIndex(0);
    }
  }, [term, assetsList]);

  // Keyboard handler: press enter to activate command
  const onSubmit = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (listIndex > 0) {
        const elt = filteredList[listIndex - 1];
        if (elt) await openFile(elt.id);
      } else {
        if (term) {
          const handled = await props.onAction(term);
          if (handled) {
            closeAlfred();
          } else {
            await submitAIRequest(term);
          }
        }
      }
    } else if (e.key === 'ArrowDown') {
      setListIndex((prev) => {
        const limit = Math.min(MaxElements, filteredList.length);
        const newVal = prev + 1 >= limit ? limit : prev + 1;
        if (newVal >= 0 && newVal < limit) {
          // Scroll the list to the selected element
          listRef.current?.children[newVal].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'center' });
        }
        return newVal;
      });
    } else if (e.key === 'ArrowUp') {
      setListIndex((prev) => {
        const limit = Math.min(MaxElements, filteredList.length);
        const newVal = prev - 1 < 0 ? 0 : prev - 1;
        if (newVal >= 0 && newVal < limit) {
          // Scroll the list to the selected element
          listRef.current?.children[newVal].scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'center' });
        }
        return newVal;
      });
    }
  };

  useEffect(() => {
    // Filter the asset keys for this room
    const filterbyRoom = assets.filter((k) => k.data.room === props.roomId && k.data.owner === user?._id);
    // Create entries
    const newList = filterbyRoom
      .map((item) => {
        // build an FileEntry object
        const entry: FileEntry = {
          id: item._id,
          owner: item.data.owner,
          ownerName: users.find((el) => el._id === item.data.owner)?.data.name || '-',
          filename: item.data.file,
          originalfilename: item.data.originalfilename,
          date: new Date(item.data.dateCreated).getTime(),
          dateAdded: new Date(item.data.dateAdded).getTime(),
          room: item.data.room,
          size: item.data.size,
          type: item.data.mimetype,
          derived: item.data.derived,
          metadata: item.data.metadata,
          selected: false,
        };
        return entry;
      })
      .sort((a, b) => {
        // compare dates (number)
        return b.dateAdded - a.dateAdded;
      });
    setAssetsList(newList);
  }, [assets, props.roomId, user]);

  // Open the file
  const openFile = async (id: string) => {
    if (!user) return;
    // Create the app
    const file = assetsList.find((a) => a.id === id);
    if (file) {
      // Get around  the center of the board
      const bx = useUIStore.getState().boardPosition.x;
      const by = useUIStore.getState().boardPosition.y;
      const scale = useUIStore.getState().scale;
      const x = Math.floor(-bx + window.innerWidth / scale / 2);
      const y = Math.floor(-by + window.innerHeight / scale / 2);
      // Create the app
      const setup = await setupAppForFile(file, x, y, props.roomId, props.boardId, user);
      if (setup) {
        createApp(setup);
        closeAlfred();
      }
    }
  };

  useEffect(() => {
    // Build the list of actions
    const actions = filteredList.map((a, idx) => {
      const extension = getExtension(a.type);
      return {
        id: a.id,
        filename: a.originalfilename,
        icon: whichIcon(extension),
        selected: idx === listIndex - 1,
      };
    });
    // Build the list of buttons
    const buttons = actions.slice(0, MaxElements).map((b, i) => (
      <Button
        key={b.id}
        m={'1px 4px 1px 1px'}
        p={2}
        minHeight={'36px'}
        width={'99%'}
        leftIcon={b.icon}
        fontSize="md"
        justifyContent="flex-start"
        variant="outline"
        backgroundColor={b.selected ? 'blue.500' : ''}
        _hover={{ backgroundColor: 'blue.500' }}
        onMouseEnter={() => setListIndex(i + 1)}
        onMouseLeave={() => setListIndex(0)}
        onClick={() => openFile(b.id)}
      >
        {b.filename}
      </Button>
    ));
    setButtonList(buttons);
  }, [filteredList, listIndex]);

  useEffect(() => {
    if (filteredList.length === 0) {
      setListIndex(0);
    }
  }, [filteredList]);


  // Voice command
  const triggerVoice = () => {
    // Check if the browser supports speech recognition
    if (recording) {
      setRecording(false);
      if (recognition) {
        recognition.stop();
      }
      return;
    }
    if ('webkitSpeechRecognition' in window) {
      recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.start();
      console.log('Speech recognition start');
      setRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech recognition result:', transcript);
        setTerm(transcript);
        setListIndex(0);
        if (initialRef.current) {
          initialRef.current.value = transcript;
          initialRef.current.focus();
        }
        // Feels to fast to trigger the action automatically
        // props.onAction(transcript);
        // props.onClose();
      };
      recognition.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error);
        setRecording(false);
        if (recognition) recognition.stop();
      };
      recognition.onend = () => {
        console.log('Speech recognition ended');
        setRecording(false);
        if (recognition) recognition.stop();
      };
    } else {
      console.error('Speech recognition not supported in this browser.');
      setRecording(false);
      if (recognition) recognition.stop();
    }
  };

  const handleOnClose = () => {
    closeAlfred();
  };

  const plannedActions = (response?.actions || []).map((action) => normalizeAction(action)).filter(Boolean);
  const showAISection = processingAI || response !== null;

  return (
    <>
      <Modal
        isOpen={props.isOpen}
        onClose={() => handleOnClose()}
        size="xl"
        initialFocusRef={initialRef}
        blockScrollOnMount={false}
        scrollBehavior={'inside'}
        isCentered

      >
        <ModalOverlay />
        <ModalContent maxH={showAISection ? '70vh' : '30vh'} top={'4rem'} minWidth="800px">
          <HStack>
            {/* Search box */}
            <InputGroup>
              <InputLeftAddon p={2} m={'8px 0px 8px 8px'} backgroundColor={intelligenceColor}>
                <IoSparklesSharp size="22px" color={'white'} />
              </InputLeftAddon>
              <Input
                ref={initialRef}
                placeholder="Asset, Command, or ask SAGE Intelligence"
                _placeholder={{ opacity: 1, color: 'gray.600' }}
                p={2}
                m={'8px 0px 8px 0px'}
                focusBorderColor="gray.500"
                _focusVisible={{ borderColor: 'gray.500' }}
                boxSizing="border-box"
                fontSize="xl"
                onChange={handleChange}
                onKeyDown={onSubmit}
              />
            </InputGroup>

            <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Voice to text - Click and speak'} openDelay={400}>
              <Button p={0} m={'8px 0px 8px 0px'} disabled={!('webkitSpeechRecognition' in window)} onClick={triggerVoice}
                colorScheme={recording ? 'red' : 'gray'}>

                {recording ? <MdStop size="24px" /> : <MdMic size="24px" />}
              </Button>
            </Tooltip>

            {/* Help box */}
            <Popover trigger="hover">
              <PopoverTrigger>
                <Button p={0} m={'8px 0px 8px 0px'}>
                  <MdInfoOutline fontSize={'24px'} />
                </Button>
              </PopoverTrigger>
              <PopoverContent fontSize={'sm'} width={'300px'}>
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader>Quick Actions</PopoverHeader>
                <PopoverBody>
                  <UnorderedList>
                    <ListItem>Select an asset to open it (click/enter)</ListItem>
                    <ListItem>
                      <b>app</b> [name]: Create an application
                    </ListItem>
                    <ListItem>
                      <b>w</b> [url]: Open URL in a webview
                    </ListItem>
                    <ListItem>
                      <b>g</b> [term]: Google search
                    </ListItem>
                    <ListItem>
                      <b>s</b> [text]: Stickie with text
                    </ListItem>
                    <ListItem>
                      <b>c</b> : Create a SageCell
                    </ListItem>
                    <ListItem>
                      <b>showui</b> : Show the panels
                    </ListItem>
                    <ListItem>
                      <b>hideui</b> : Hide the panels
                    </ListItem>
                    <ListItem>
                      <b>light</b> : Switch to light mode
                    </ListItem>
                    <ListItem>
                      <b>calc</b> : Open the calculator app
                    </ListItem>
                    <ListItem>
                      <b>dark</b> : Switch to dark mode
                    </ListItem>
                    <ListItem>
                      <b>tag</b> : Search applications with tags
                    </ListItem>
                    <ListItem>
                      <b>save</b> [filename]: Save the board to a file
                    </ListItem>
                    <ListItem>
                      <b>clear</b> : Close all applications
                    </ListItem>
                    <ListItem>Natural language requests stay in Alfred and show proposed board actions before you apply them</ListItem>
                  </UnorderedList>
                </PopoverBody>
              </PopoverContent>
            </Popover>

            <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Settings'} openDelay={400}>
              <Button p={0} m={'8px 8px 8px 0px'} onClick={editSettingsOnOpen}>
                <MdSettings size="24px" />
              </Button>
            </Tooltip>
          </HStack>
          <VStack m={'0px 4px 4px 6px'} p={0} overflowY={'auto'} overflowX={'clip'} ref={listRef} spacing={1}>
            {buttonList}
          </VStack>
          {showAISection && (
            <>
              <Divider />
              <Box p={3} overflowY="auto">
                {lastPrompt && (
                  <Box mb={3}>
                    <Text fontSize="xs" textTransform="uppercase" color="gray.500" fontWeight="bold">
                      Prompt
                    </Text>
                    <Text fontSize="sm">{lastPrompt}</Text>
                  </Box>
                )}

                {processingAI && (
                  <HStack alignItems="center" spacing={3} mb={3}>
                    <Spinner size="sm" color={intelligenceColor} />
                    <Text fontSize="sm">Alfred is inspecting the current board and planning your request.</Text>
                  </HStack>
                )}

                {response && (
                  <VStack align="stretch" spacing={3}>
                    <Box borderWidth="1px" borderRadius="md" p={3}>
                      <Text fontSize="xs" textTransform="uppercase" color="gray.500" fontWeight="bold" mb={1}>
                        Response
                      </Text>
                      <Box fontSize="sm">
                        <Markdown>{response.r}</Markdown>
                      </Box>
                    </Box>

                    {response.toolCalls && response.toolCalls.length > 0 && (
                      <Box borderWidth="1px" borderRadius="md" p={3}>
                        <Text fontSize="xs" textTransform="uppercase" color="gray.500" fontWeight="bold" mb={2}>
                          Process
                        </Text>
                        <VStack align="stretch" spacing={2}>
                          {response.toolCalls.map((step, index) => (
                            <Box key={`${step.name}-${index}`} borderWidth="1px" borderRadius="md" p={2}>
                              <Text fontSize="xs" fontFamily="mono" color="gray.500">
                                {index + 1}. {step.name}
                              </Text>
                              <Text fontSize="sm">{step.summary}</Text>
                            </Box>
                          ))}
                        </VStack>
                      </Box>
                    )}

                    {plannedActions.length > 0 && (
                      <Box borderWidth="1px" borderRadius="md" p={3}>
                        <HStack justifyContent="space-between" alignItems="center" mb={2}>
                          <Text fontSize="xs" textTransform="uppercase" color="gray.500" fontWeight="bold">
                            Proposed Actions
                          </Text>
                          {plannedActions.length > 1 && (
                            <Button size="xs" colorScheme="purple" onClick={applyAllActions}>
                              Apply all
                            </Button>
                          )}
                        </HStack>
                        <List spacing={2}>
                          {plannedActions.map((action: any, index) => (
                            <Button
                              key={`action-${index}`}
                              justifyContent="flex-start"
                              leftIcon={<MdOpenInNew />}
                              onClick={() => applyAction(action)}
                              colorScheme="purple"
                              variant="outline"
                            >
                              {action.app === 'Stickie' ? `Create Stickie ${index + 1}` : `Create ${action.app}`}
                            </Button>
                          ))}
                        </List>
                      </Box>
                    )}
                  </VStack>
                )}
              </Box>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Intelligence settings */}
      <EditUserSettingsModal isOpen={editSettingsIsOpen} onClose={editSettingsOnClose} tab={'intelligence'} />
    </>
  );
}

const AlfredComponent = React.memo(AlfredUI);

/**
 * Pick an icon based on file type (extension string)
 *
 * @param {string} type
 * @returns {JSX.Element}
 */
function whichIcon(type: string) {
  switch (type) {
    case 'pdf':
      return <MdOutlinePictureAsPdf style={{ color: 'tomato' }} size={'20px'} />;
    case 'jpeg':
      return <MdOutlineImage style={{ color: 'lightblue' }} size={'20px'} />;
    case 'mp4':
      return <MdOndemandVideo style={{ color: 'lightgreen' }} size={'20px'} />;
    case 'json':
      return <MdOutlineStickyNote2 style={{ color: 'darkgray' }} size={'20px'} />;
    default:
      return <MdOutlineFilePresent size={'20px'} />;
  }
}

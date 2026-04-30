/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { create } from 'zustand';
// Import Chakra UI elements
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  InputGroup,
  Input,
  VStack,
  Button,
  IconButton,
  Box,
  Divider,
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
  Badge,
  Wrap,
  WrapItem,
  Flex,
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
  useUserSettings,
  EditUserSettingsModal,
} from '@sage3/frontend';
import { apiUrls } from '../../../config/urls';

import { App, AppName, AppState } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import { Applications } from '@sage3/applications/apps';
import { SeerRequest, SeerResponse, SError, getExtension } from '@sage3/shared';
import { FileEntry } from '@sage3/shared/types';

type props = {
  boardId: string;
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
};

type SeerHistoryMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  success?: boolean;
};

type SeerSession = {
  previousQuestion: string[];
  previousAnswer: string[];
  messages: SeerHistoryMessage[];
  latestResponse: SeerResponse | null;
};

type SeerSessionStore = {
  sessions: Record<string, SeerSession>;
  startRequest: (boardId: string, prompt: string) => void;
  finishRequest: (boardId: string, prompt: string, response: SeerResponse) => void;
  clearSession: (boardId: string) => void;
};

const MaxElements = 12;
const MaxHistoryTurns = 10;
const MaxHistoryMessages = MaxHistoryTurns * 2;
const MaxPendingHistoryMessages = MaxHistoryMessages + 1;
let recognition: any = null;

function createEmptySession(): SeerSession {
  return {
    previousQuestion: [],
    previousAnswer: [],
    messages: [],
    latestResponse: null,
  };
}

const useSeerSessionStore = create<SeerSessionStore>()((set, get) => ({
  sessions: {},
  startRequest: (boardId, prompt) => {
    const existing = get().sessions[boardId] || createEmptySession();
    const nextMessage: SeerHistoryMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: prompt,
    };
    set({
      sessions: {
        ...get().sessions,
        [boardId]: {
          ...existing,
          latestResponse: null,
          messages: [...existing.messages, nextMessage].slice(-MaxPendingHistoryMessages),
        },
      },
    });
  },
  finishRequest: (boardId, prompt, response) => {
    const existing = get().sessions[boardId] || createEmptySession();
    const nextMessage: SeerHistoryMessage = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      content: response.r,
      success: response.success,
    };
    set({
      sessions: {
        ...get().sessions,
        [boardId]: {
          previousQuestion: response.success ? [...existing.previousQuestion, prompt].slice(-MaxHistoryTurns) : existing.previousQuestion,
          previousAnswer: response.success ? [...existing.previousAnswer, response.r].slice(-MaxHistoryTurns) : existing.previousAnswer,
          messages: [...existing.messages, nextMessage].slice(-MaxHistoryMessages),
          latestResponse: response,
        },
      },
    });
  },
  clearSession: (boardId) => {
    set({
      sessions: {
        ...get().sessions,
        [boardId]: createEmptySession(),
      },
    });
  },
}));

function buildStatePreview(state: AppState | Record<string, any> | undefined) {
  if (!state || typeof state !== 'object') return undefined;

  const source = state as Record<string, any>;
  const preview: Record<string, any> = {};

  if (typeof source.text === 'string') {
    preview.text = source.text.slice(0, 280);
  }

  for (const key of ['color', 'assetid', 'currentPage', 'url', 'pluginName', 'language', 'page', 'pdfCurrentPage']) {
    if (key in source) {
      preview[key] = source[key];
    }
  }

  return Object.keys(preview).length > 0 ? preview : undefined;
}

function buildCurrentBoardAppsSnapshot(apps: App[]) {
  return apps.map((app) => ({
    id: app._id,
    roomId: app.data.roomId,
    boardId: app.data.boardId,
    title: app.data.title || '',
    type: app.data.type,
    position: {
      x: app.data.position.x,
      y: app.data.position.y,
      z: app.data.position.z,
    },
    size: {
      width: app.data.size.width,
      height: app.data.size.height,
      depth: app.data.size.depth,
    },
    statePreview: buildStatePreview(app.data.state),
  }));
}

function getScopeLabel(apps: App[], selectedAppIds: string[], focusedAppId?: string, selectedAppId?: string) {
  if (selectedAppIds.length > 0) {
    if (selectedAppIds.length === 1) {
      const selected = apps.find((app) => app._id === selectedAppIds[0]);
      return selected ? `Selection: ${selected.data.title || selected.data.type}` : 'Selection: 1 app';
    }
    return `Selection: ${selectedAppIds.length} apps`;
  }

  const focusedId = focusedAppId || selectedAppId;
  if (focusedId) {
    const focused = apps.find((app) => app._id === focusedId);
    return focused ? `Focused: ${focused.data.title || focused.data.type}` : 'Focused app';
  }

  return 'Scope: Current board';
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function summarizePlannedActions(actions: any[]) {
  const updates = actions.filter((action) => action?.type === 'update_app').length;
  const creations = new Map<string, number>();

  actions.forEach((action) => {
    if (action?.type !== 'create_app') return;
    const key = action.app || 'App';
    creations.set(key, (creations.get(key) || 0) + 1);
  });

  const parts: string[] = [];
  if (updates > 0) {
    parts.push(`${updates} ${pluralize(updates, 'app update')}`);
  }

  creations.forEach((count, appName) => {
    parts.push(`${count} new ${pluralize(count, appName)}`);
  });

  return parts.length > 0 ? parts : [`${actions.length} ${pluralize(actions.length, 'planned change')}`];
}

export function Seer(props: props) {
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
  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const focusedAppId = useUIStore((state) => state.focusedAppId);
  const selectedAppsIds = useUIStore((state) => state.selectedAppsIds);

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

  // SEER quick bar response
  const seerAction = useCallback(
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
    <SeerComponent
      onAction={seerAction}
      roomId={props.roomId}
      boardId={props.boardId}
      currentBoardApps={apps}
      selectedAppId={selectedAppId}
      focusedAppId={focusedAppId}
      selectedAppIds={selectedAppsIds}
      isOpen={props.isOpen}
      onClose={props.onClose}
    />
  );
}

/**
 * Props for the file manager modal behavior
 * from Chakra UI Modal dialog
 */
type SeerUIProps = {
  onAction: (command: string) => boolean | Promise<boolean>;
  roomId: string;
  boardId: string;
  currentBoardApps: App[];
  selectedAppId: string;
  focusedAppId: string;
  selectedAppIds: string[];
  isOpen: boolean;
  onClose: () => void;
};

/**
 * React component to get and display the asset list
 */
function SeerUI(props: SeerUIProps): JSX.Element {
  // Element to set the focus to when opening the dialog
  const initialRef = useRef<HTMLInputElement>(null);
  // List of elements
  const listRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<string>();
  const [location, setLocation] = useState('');
  const [processingAI, setProcessingAI] = useState(false);

  // Apps
  const createApp = useAppStore((state) => state.create);
  const updateApp = useAppStore((state) => state.update);
  const updateAppState = useAppStore((state) => state.updateState);
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
  const boardSession = useSeerSessionStore((state) => state.sessions[props.boardId]);
  const startSessionRequest = useSeerSessionStore((state) => state.startRequest);
  const finishSessionRequest = useSeerSessionStore((state) => state.finishRequest);
  const clearSession = useSeerSessionStore((state) => state.clearSession);
  const previousQuestion = boardSession?.previousQuestion || [];
  const previousAnswer = boardSession?.previousAnswer || [];
  const conversation = boardSession?.messages || [];
  const response = boardSession?.latestResponse || null;
  const subtleTextColor = useColorModeValue('gray.500', 'gray.400');
  const conversationBorderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const userBubbleBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.80');
  const assistantBubbleBg = useColorModeValue('white', 'whiteAlpha.100');
  const processingBg = useColorModeValue('purple.50', 'whiteAlpha.100');
  const processingBorderColor = useColorModeValue('purple.200', 'whiteAlpha.200');
  const plannedBg = useColorModeValue('purple.50', 'purple.900');
  const plannedBorderColor = useColorModeValue('purple.200', 'purple.500');
  const plannedEyebrowColor = useColorModeValue('purple.600', 'purple.200');
  const plannedTextColor = useColorModeValue('gray.800', 'white');
  const plannedBadgeBg = useColorModeValue('purple.100', 'purple.800');
  const plannedBadgeColor = useColorModeValue('purple.700', 'purple.100');
  const processBorderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

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

  const closeSeer = useCallback(() => {
    if (recording && recognition) {
      recognition.stop();
      setRecording(false);
    }
    setProcessingAI(false);
    setTerm('');
    setListIndex(0);
    if (initialRef.current) {
      initialRef.current.value = '';
    }
    props.onClose();
  }, [props, recording]);

  const submitAIRequest = useCallback(
    async (prompt: string) => {
      if (!user) return;

      const boardCursor = getBoardCursor();
      const cursor = boardCursor || { x: 100, y: 100, z: 0 };
      startSessionRequest(props.boardId, prompt);
      const body: SeerRequest = {
        id: window.crypto?.randomUUID?.() || `seer-${Date.now()}`,
        ctx: {
          previousQ: previousQuestion.slice(-MaxHistoryTurns),
          previousA: previousAnswer.slice(-MaxHistoryTurns),
          pos: [cursor.x, cursor.y, 0],
          roomId: props.roomId,
          boardId: props.boardId,
          currentBoardApps: buildCurrentBoardAppsSnapshot(props.currentBoardApps),
          selectedAppId: props.selectedAppId || undefined,
          focusedAppId: props.focusedAppId || undefined,
          selectedAppIds: props.selectedAppIds.length > 0 ? props.selectedAppIds : undefined,
        },
        q: prompt,
        user: user.data.name,
        location,
        model: settings.aiModel || 'openai',
      };

      setProcessingAI(true);
      setTerm('');
      setListIndex(0);
      if (initialRef.current) {
        initialRef.current.value = '';
        initialRef.current.focus();
      }

      try {
        const seerAgentUrl = `${apiUrls.ai.agents.base}/seer`;
        const raw = await fetch(seerAgentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await raw.json()) as SeerResponse | SError;

        if ('message' in data) {
          const nextResponse: SeerResponse = {
            id: body.id,
            r: data.message,
            success: false,
            actions: [],
            toolCalls: [],
          };
          finishSessionRequest(props.boardId, prompt, nextResponse);
          return;
        }

        finishSessionRequest(props.boardId, prompt, data);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        const nextResponse: SeerResponse = {
          id: body.id,
          r: `Error from SEER: ${message}`,
          success: false,
          actions: [],
          toolCalls: [],
        };
        finishSessionRequest(props.boardId, prompt, nextResponse);
      } finally {
        setProcessingAI(false);
      }
    },
    [
      finishSessionRequest,
      getBoardCursor,
      location,
      previousAnswer,
      previousQuestion,
      props.boardId,
      props.currentBoardApps,
      props.focusedAppId,
      props.roomId,
      props.selectedAppId,
      props.selectedAppIds,
      settings.aiModel,
      startSessionRequest,
      user,
    ]
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
      if (!normalizedAction) return;

      if (normalizedAction.type === 'create_app') {
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
        return;
      }

      if (normalizedAction.type === 'update_app') {
        const appId = normalizedAction.id;
        const updates = normalizedAction.updates || {};
        const topLevelUpdates: Record<string, any> = {};

        if (updates.position) topLevelUpdates.position = updates.position;
        if (updates.size) topLevelUpdates.size = updates.size;
        if (updates.title) topLevelUpdates.title = updates.title;

        let success = true;

        if (Object.keys(topLevelUpdates).length > 0) {
          const res = await updateApp(appId, topLevelUpdates as any);
          success = Boolean(res);
        }

        if (success && updates.state) {
          await updateAppState(appId, updates.state);
        }

        toast({
          title: success ? 'Action applied' : 'Action failed',
          description: success ? 'App updated on the board.' : 'Unable to apply update action.',
          status: success ? 'success' : 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [createApp, normalizeAction, props.boardId, props.roomId, toast, updateApp, updateAppState]
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
            closeSeer();
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
        closeSeer();
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
    closeSeer();
  };

  const plannedActions = (response?.actions || []).map((action) => normalizeAction(action)).filter(Boolean);
  const plannedActionSummary = summarizePlannedActions(plannedActions);
  const showAISection = processingAI || response !== null || conversation.length > 0;
  const scopeLabel = getScopeLabel(props.currentBoardApps, props.selectedAppIds, props.focusedAppId, props.selectedAppId);
  const showAssetResults = buttonList.length > 0 && (!showAISection || Boolean(term));

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
        <ModalContent maxH="78vh" minWidth="860px" display="flex" flexDirection="column">
          <ModalHeader borderBottomWidth="1px" py={4}>
            <HStack alignItems="flex-start" spacing={4} pr={20}>
              <Box
                p={2}
                backgroundColor={intelligenceColor}
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <IoSparklesSharp size="22px" color={'white'} />
              </Box>
              <Box flex="1">
                <Text fontSize="lg" fontWeight="bold">
                  SEER
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Board-aware assistant for search, commands, and approval-based changes
                </Text>
              </Box>
            </HStack>
            <ModalCloseButton top={4} right={4} />
          </ModalHeader>

          <ModalBody px={0} py={0} overflow="hidden">
            <Box px={4} py={4} overflowY="auto" maxH="56vh">
              {conversation.length > 0 ? (
                <VStack align="stretch" spacing={3} mb={showAISection || showAssetResults ? 4 : 0}>
                  {conversation.map((message) => (
                    <Flex
                      key={message.id}
                      justifyContent={message.role === 'user' ? 'flex-end' : 'flex-start'}
                    >
                      <Box
                        maxWidth="78%"
                        borderWidth="1px"
                        borderRadius="xl"
                        px={4}
                        py={3}
                        backgroundColor={message.role === 'user' ? userBubbleBg : assistantBubbleBg}
                        borderColor={conversationBorderColor}
                      >
                        <Text fontSize="xs" textTransform="uppercase" color={subtleTextColor} fontWeight="bold" mb={1}>
                          {message.role === 'user' ? 'You' : 'SEER'}
                        </Text>
                        <Box
                          fontSize="sm"
                          sx={{
                            '& p': { mb: 2 },
                            '& p:last-of-type': { mb: 0 },
                            '& ul, & ol': {
                              pl: 4,
                              ml: 0,
                              my: 2,
                              listStylePosition: 'inside',
                            },
                            '& li': {
                              ml: 0,
                              mb: 1,
                            },
                            '& li:last-child': { mb: 0 },
                          }}
                        >
                          {message.role === 'assistant' ? <Markdown>{message.content}</Markdown> : <Text>{message.content}</Text>}
                        </Box>
                      </Box>
                    </Flex>
                  ))}
                </VStack>
              ) : (
                <Box mb={showAssetResults ? 4 : 0}>
                  <Text fontSize="sm" color={subtleTextColor}>
                    Ask SEER about the current board, selected apps, or a searched asset.
                  </Text>
                </Box>
              )}

              {processingAI && (
                <Box borderWidth="1px" borderRadius="xl" px={4} py={3} mb={4} backgroundColor={processingBg} borderColor={processingBorderColor}>
                  <HStack alignItems="center" spacing={3}>
                    <Spinner size="sm" color={intelligenceColor} />
                    <Text fontSize="sm">SEER is inspecting the board and preparing a response.</Text>
                  </HStack>
                </Box>
              )}

              {plannedActions.length > 0 && (
                <Box borderWidth="1px" borderRadius="xl" px={4} py={4} mb={4} backgroundColor={plannedBg} borderColor={plannedBorderColor}>
                  <HStack justifyContent="space-between" alignItems="flex-start" spacing={4}>
                    <Box>
                      <Text fontSize="xs" textTransform="uppercase" color={plannedEyebrowColor} fontWeight="bold" mb={1}>
                        Ready to Apply
                      </Text>
                      <Text fontSize="md" fontWeight="semibold" mb={2} color={plannedTextColor}>
                        {plannedActions.length} {pluralize(plannedActions.length, 'change')} prepared
                      </Text>
                      <Wrap spacing={2}>
                        {plannedActionSummary.map((summary) => (
                          <WrapItem key={summary}>
                            <Badge bg={plannedBadgeBg} color={plannedBadgeColor} px={2} py={1} borderRadius="md">
                              {summary}
                            </Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                    <Button colorScheme="purple" leftIcon={<MdOpenInNew />} onClick={applyAllActions}>
                      Apply All
                    </Button>
                  </HStack>
                </Box>
              )}

              {response?.toolCalls && response.toolCalls.length > 0 && (
                <Accordion allowToggle>
                  <AccordionItem borderWidth="1px" borderRadius="xl" borderColor={processBorderColor}>
                    <AccordionButton px={4} py={3}>
                      <Box flex="1" textAlign="left">
                        <Text fontSize="xs" textTransform="uppercase" color={subtleTextColor} fontWeight="bold">
                          How SEER Got Here
                        </Text>
                        <Text fontSize="sm" color={subtleTextColor}>
                          {response.toolCalls.length} {pluralize(response.toolCalls.length, 'step')} used
                        </Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pt={0} pb={4}>
                      <VStack align="stretch" spacing={2}>
                        {response.toolCalls.map((step, index) => (
                          <Box key={`${step.name}-${index}`} borderWidth="1px" borderRadius="lg" p={3} borderColor={processBorderColor}>
                            <Text fontSize="xs" fontFamily="mono" color={subtleTextColor} mb={1}>
                              {index + 1}. {step.name}
                            </Text>
                            <Text fontSize="sm">{step.summary}</Text>
                          </Box>
                        ))}
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              )}

              {showAssetResults && (
                <Box mt={response?.toolCalls && response.toolCalls.length > 0 ? 4 : 0}>
                  <Text fontSize="xs" textTransform="uppercase" color={subtleTextColor} fontWeight="bold" mb={2}>
                    Assets
                  </Text>
                  <VStack p={0} overflowY={'auto'} overflowX={'clip'} ref={listRef} spacing={1} align="stretch">
                    {buttonList}
                  </VStack>
                </Box>
              )}
            </Box>
          </ModalBody>

          <Divider />
          <ModalFooter px={4} py={3}>
            <VStack width="100%" align="stretch" spacing={3}>
              <Flex justifyContent="space-between" alignItems="center" gap={3} wrap="wrap">
                <HStack spacing={3} flexWrap="wrap">
                  <Badge colorScheme="purple" variant="subtle" px={2} py={1} borderRadius="md">
                    {scopeLabel}
                  </Badge>
                  {conversation.length > 0 && (
                    <Button size="sm" variant="outline" colorScheme="red" onClick={() => clearSession(props.boardId)}>
                      Clear Session
                    </Button>
                  )}
                </HStack>

                <HStack spacing={2}>
                  <Popover trigger="hover">
                    <PopoverTrigger>
                      <IconButton aria-label="SEER help" icon={<MdInfoOutline fontSize={'20px'} />} size="sm" />
                    </PopoverTrigger>
                    <PopoverContent fontSize={'sm'} width={'320px'}>
                      <PopoverArrow />
                      <PopoverCloseButton />
                      <PopoverHeader>SEER Quick Actions</PopoverHeader>
                      <PopoverBody>
                        <UnorderedList>
                          <ListItem>Select an asset to open it</ListItem>
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
                            <b>c</b>: Create a SageCell
                          </ListItem>
                          <ListItem>
                            <b>showui</b> / <b>hideui</b>: Toggle the panels
                          </ListItem>
                          <ListItem>
                            <b>light</b> / <b>dark</b>: Change theme
                          </ListItem>
                          <ListItem>
                            <b>calc</b>: Open the calculator app
                          </ListItem>
                          <ListItem>
                            <b>tag</b>: Search applications with tags
                          </ListItem>
                          <ListItem>
                            <b>save</b> [filename]: Save the board
                          </ListItem>
                          <ListItem>
                            <b>clear</b>: Close all applications
                          </ListItem>
                          <ListItem>Natural language requests stay in SEER and show reviewable board changes before you apply them</ListItem>
                        </UnorderedList>
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                  <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Settings'} openDelay={400}>
                    <IconButton aria-label="SEER settings" icon={<MdSettings size="20px" />} size="sm" onClick={editSettingsOnOpen} />
                  </Tooltip>
                </HStack>
              </Flex>

              <HStack width="100%" spacing={3} alignItems="center">
                <InputGroup>
                  <InputLeftAddon p={2} backgroundColor={intelligenceColor} color="white" border="none">
                    <IoSparklesSharp size="20px" />
                  </InputLeftAddon>
                  <Input
                    ref={initialRef}
                    placeholder="Ask SEER, search assets, or run a quick command"
                    _placeholder={{ opacity: 1, color: 'gray.600' }}
                    focusBorderColor="gray.500"
                    _focusVisible={{ borderColor: 'gray.500' }}
                    boxSizing="border-box"
                    fontSize="md"
                    onChange={handleChange}
                    onKeyDown={onSubmit}
                  />
                </InputGroup>

                <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Voice to text - Click and speak'} openDelay={400}>
                  <Button
                    disabled={!('webkitSpeechRecognition' in window)}
                    onClick={triggerVoice}
                    colorScheme={recording ? 'red' : 'gray'}
                    minW="44px"
                    px={0}
                  >
                    {recording ? <MdStop size="24px" /> : <MdMic size="24px" />}
                  </Button>
                </Tooltip>
              </HStack>
            </VStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Intelligence settings */}
      <EditUserSettingsModal isOpen={editSettingsIsOpen} onClose={editSettingsOnClose} tab={'intelligence'} />
    </>
  );
}

const SeerComponent = React.memo(SeerUI);

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

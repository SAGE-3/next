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
  MdDeleteSweep,
  MdHelpOutline,
  MdNoteAdd,
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
  useConfigStore,
  useThrottleApps,
  useInsightStore,
  downloadFile,
  useYjs,
  useUserSettings,
  EditUserSettingsModal,
} from '@sage3/frontend';
import { apiUrls } from '../../../config/urls';
import { ConfirmModal } from './ConfirmModal';
import {
  buildSeerCurrentBoardAppsSnapshot,
  getSeerScopeLabel,
  pluralizeSeerCount,
  summarizeSeerAppliedActions,
  seerResponseToStickieText,
  seerYjsReplaceFieldByType,
  summarizeSeerPlannedActions,
} from './seerSupport';

import { App, AppName, AppState } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';
import { Applications } from '@sage3/applications/apps';
import { SeerRequest, SeerResponse, SError } from '@sage3/shared';

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

type SeerApplyResult = {
  success: boolean;
  action: any | null;
  message?: string;
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

function SeerUI(props: SeerUIProps): JSX.Element {
  // Element to set the focus to when opening the dialog
  const initialRef = useRef<HTMLInputElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<string>();
  const [location, setLocation] = useState('');
  const [processingAI, setProcessingAI] = useState(false);

  // Apps
  const createApp = useAppStore((state) => state.create);
  const updateApp = useAppStore((state) => state.update);
  const updateAppState = useAppStore((state) => state.updateState);
  const { yApps } = useYjs();
  // Pull user/cursor/scope state from the live board session so SEER requests
  // always reflect the board the user is currently looking at.
  const { user } = useUser();
  const { getBoardCursor } = useCursorBoardPosition();
  const { settings } = useUserSettings();
  // colors
  const intelligenceColor = useColorModeValue('purple.500', 'purple.300');
  const { isOpen: editSettingsIsOpen, onOpen: editSettingsOnOpen, onClose: editSettingsOnClose } = useDisclosure();
  const {
    isOpen: clearSessionConfirmIsOpen,
    onOpen: clearSessionConfirmOnOpen,
    onClose: clearSessionConfirmOnClose,
  } = useDisclosure();
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
      // Keep a short per-board conversation locally so follow-up prompts like
      // "yes, do that" can be resolved by the backend without server storage.
      startSessionRequest(props.boardId, prompt);
      const body: SeerRequest = {
        id: window.crypto?.randomUUID?.() || `seer-${Date.now()}`,
        ctx: {
          previousQ: previousQuestion.slice(-MaxHistoryTurns),
          previousA: previousAnswer.slice(-MaxHistoryTurns),
          pos: [cursor.x, cursor.y, 0],
          roomId: props.roomId,
          boardId: props.boardId,
          currentBoardApps: buildSeerCurrentBoardAppsSnapshot(props.currentBoardApps),
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
    async (action: any, options?: { silent?: boolean }): Promise<SeerApplyResult> => {
      const silent = options?.silent ?? false;
      const normalizedAction = normalizeAction(action);
      if (!normalizedAction) return { success: false as const, action: null, message: 'Unable to read the SEER action payload.' };

      try {
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

          if (!silent) {
            toast({
              title: res?.success ? 'Action applied' : 'Action failed',
              description: res?.success ? `${type} added to the board.` : res?.message || 'Unable to apply action.',
              status: res?.success ? 'success' : 'error',
              duration: 3000,
              isClosable: true,
            });
          }

          return {
            success: Boolean(res?.success),
            action: normalizedAction,
            message: res?.success ? undefined : res?.message || 'Unable to apply action.',
          };
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

          if (!silent) {
            toast({
              title: success ? 'Action applied' : 'Action failed',
              description: success ? 'App updated on the board.' : 'Unable to apply update action.',
              status: success ? 'success' : 'error',
              duration: 3000,
              isClosable: true,
            });
          }

          return {
            success,
            action: normalizedAction,
            message: success ? undefined : 'Unable to apply update action.',
          };
        }

        if (normalizedAction.type === 'replace_yjs_content') {
          const appId = normalizedAction.id;
          const app = props.currentBoardApps.find((currentApp) => currentApp._id === appId);
          const appType = normalizedAction.appType || app?.data.type;
          const field = normalizedAction.field || seerYjsReplaceFieldByType[appType];
          const content = normalizedAction.content;

          if (!yApps) {
            const message = 'Collaborative editing is not connected for this board right now.';
            if (!silent) {
              toast({
                title: 'Action failed',
                description: message,
                status: 'error',
                duration: 3000,
                isClosable: true,
              });
            }
            return { success: false as const, action: normalizedAction, message };
          }

          if (!field || typeof content !== 'string') {
            const message = 'SEER returned an unsupported collaborative replace action.';
            if (!silent) {
              toast({
                title: 'Action failed',
                description: message,
                status: 'error',
                duration: 3000,
                isClosable: true,
              });
            }
            return { success: false as const, action: normalizedAction, message };
          }

          const yText = yApps.doc.getText(appId);
          // Apply collaborative rewrites through Yjs first so every connected
          // client sees the same CRDT update instead of a stale state patch.
          yApps.doc.transact(() => {
            yText.delete(0, yText.length);
            yText.insert(0, content);
          });
          await updateAppState(appId, { [field]: content } as any);

          if (!silent) {
            toast({
              title: 'Action applied',
              description: `${appType || 'Collaborative app'} content replaced on the board.`,
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
          }

          return {
            success: true as const,
            action: normalizedAction,
            message: undefined,
          };
        }

        return { success: false as const, action: normalizedAction, message: 'SEER returned an unsupported action type.' };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to apply action.';
        if (!silent) {
          toast({
            title: 'Action failed',
            description: message,
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
        return { success: false as const, action: normalizedAction, message };
      }
    },
    [createApp, normalizeAction, props.boardId, props.currentBoardApps, props.roomId, toast, updateApp, updateAppState, yApps]
  );

  const applyAllActions = useCallback(async () => {
    if (!response?.actions) return;
    const appliedActions: any[] = [];
    let failedCount = 0;

    // Silence per-action notifications so large batches collapse into one
    // readable summary toast instead of covering the whole screen.
    for (const action of response.actions) {
      const result = await applyAction(action, { silent: true });
      if (result.success && result.action) {
        appliedActions.push(result.action);
      } else {
        failedCount += 1;
      }
    }

    if (appliedActions.length > 0 && failedCount === 0) {
      toast({
        title: 'Actions applied',
        description: summarizeSeerAppliedActions(appliedActions),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (appliedActions.length > 0 && failedCount > 0) {
      toast({
        title: 'Applied with issues',
        description: `${summarizeSeerAppliedActions(appliedActions)} ${failedCount} ${pluralizeSeerCount(failedCount, 'action')} failed.`,
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: 'Unable to apply changes',
      description: `${failedCount} ${pluralizeSeerCount(failedCount, 'action')} failed.`,
      status: 'error',
      duration: 4000,
      isClosable: true,
    });
  }, [applyAction, response?.actions, toast]);

  const createStickieFromResponse = useCallback(
    async (content: string) => {
      if (!user) return;

      const boardCursor = getBoardCursor();
      const cursor = boardCursor || { x: 100, y: 100, z: 0 };
      const width = 400;
      const height = 420;
      const stickieText = seerResponseToStickieText(content);

      const res = await createApp({
        title: 'SEER',
        roomId: props.roomId,
        boardId: props.boardId,
        position: { x: cursor.x - width / 2, y: cursor.y - height / 2, z: 0 },
        size: { width, height, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Stickie',
        state: { ...(initialValues['Stickie'] as AppState), text: stickieText, color: 'purple' },
        raised: true,
        dragging: false,
        pinned: false,
      });

      toast({
        title: res?.success ? 'Stickie created' : 'Unable to create stickie',
        description: res?.success ? 'SEER response added to the board as a stickie.' : res?.message || 'The response could not be turned into a stickie.',
        status: res?.success ? 'success' : 'error',
        duration: 3000,
        isClosable: true,
      });
    },
    [createApp, getBoardCursor, props.boardId, props.roomId, toast, user]
  );

  // Keyboard handler: press enter to activate command
  const onSubmit = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (term) {
        const handled = await props.onAction(term);
        if (handled) {
          closeSeer();
        } else {
          await submitAIRequest(term);
        }
      }
    }
  };

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

  const handleClearSession = useCallback(() => {
    clearSession(props.boardId);
    clearSessionConfirmOnClose();
  }, [clearSession, clearSessionConfirmOnClose, props.boardId]);

  const plannedActions = (response?.actions || []).map((action) => normalizeAction(action)).filter(Boolean);
  const plannedActionSummary = summarizeSeerPlannedActions(plannedActions);
  const showAISection = processingAI || response !== null || conversation.length > 0;
  const scopeLabel = getSeerScopeLabel(props.currentBoardApps, props.selectedAppIds, props.focusedAppId, props.selectedAppId);

  useEffect(() => {
    if (!props.isOpen || !conversationEndRef.current) return;

    const raf = window.requestAnimationFrame(() => {
      conversationEndRef.current?.scrollIntoView({
        behavior: conversation.length > 0 ? 'smooth' : 'auto',
        block: 'end',
      });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [props.isOpen, conversation.length, processingAI, plannedActions.length, response?.id, response?.toolCalls?.length]);

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
                <VStack align="stretch" spacing={3} mb={showAISection ? 4 : 0}>
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
                        {message.role === 'assistant' && message.content.trim().length > 0 && (
                          <Flex justifyContent="flex-end" mt={3}>
                            <Tooltip label="Create a stickie from this response" hasArrow openDelay={400}>
                              <Button
                                size="xs"
                                variant="outline"
                                leftIcon={<MdNoteAdd />}
                                onClick={() => void createStickieFromResponse(message.content)}
                              >
                                Stickie
                              </Button>
                            </Tooltip>
                          </Flex>
                        )}
                      </Box>
                    </Flex>
                  ))}
                </VStack>
              ) : (
                <Box>
                  <Text fontSize="sm" color={subtleTextColor}>
                    Ask SEER about the current board or your current selection.
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
                        {plannedActions.length} {pluralizeSeerCount(plannedActions.length, 'change')} prepared
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
                          {response.toolCalls.length} {pluralizeSeerCount(response.toolCalls.length, 'step')} used
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

              <Box ref={conversationEndRef} h="1px" />

            </Box>
          </ModalBody>

          <Divider />
          <ModalFooter px={4} py={3}>
            <VStack width="100%" align="stretch" spacing={3}>
              <Flex justifyContent="space-between" alignItems="center" gap={3} wrap="wrap">
                <Flex alignItems="center" gap={3} wrap="wrap" flex="1" minW={0}>
                  <Tooltip label={scopeLabel} hasArrow placement="top-start" openDelay={500}>
                    <Badge
                      colorScheme="purple"
                      variant="subtle"
                      px={2}
                      py={1}
                      borderRadius="md"
                      maxW="100%"
                      display="inline-block"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                    >
                      {scopeLabel}
                    </Badge>
                  </Tooltip>
                </Flex>

                <HStack spacing={2}>
                  {conversation.length > 0 && (
                    <Tooltip fontSize={'xs'} placement="top" hasArrow={true} label={'Clear session'} openDelay={400}>
                      <IconButton
                        aria-label="Clear SEER session"
                        icon={<MdDeleteSweep size="20px" />}
                        size="sm"
                        variant="ghost"
                        onClick={clearSessionConfirmOnOpen}
                      />
                    </Tooltip>
                  )}
                  <Popover trigger="hover">
                    <PopoverTrigger>
                      <IconButton aria-label="SEER help" icon={<MdHelpOutline fontSize={'20px'} />} size="sm" variant="ghost" />
                    </PopoverTrigger>
                    <PopoverContent fontSize={'sm'} width={'320px'}>
                      <PopoverArrow />
                      <PopoverCloseButton />
                      <PopoverHeader>SEER Quick Actions</PopoverHeader>
                      <PopoverBody>
                        <UnorderedList>
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
                    <IconButton aria-label="SEER settings" icon={<MdSettings size="20px" />} size="sm" variant="ghost" onClick={editSettingsOnOpen} />
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
                    placeholder="Ask SEER or run a quick command"
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
      <ConfirmModal
        isOpen={clearSessionConfirmIsOpen}
        onClose={clearSessionConfirmOnClose}
        onConfirm={handleClearSession}
        title="Clear SEER Session?"
        message="This will remove the current SEER conversation history for this board. This cannot be undone."
        confirmText="Clear Session"
        confirmColor="red"
      />
    </>
  );
}

const SeerComponent = React.memo(SeerUI);

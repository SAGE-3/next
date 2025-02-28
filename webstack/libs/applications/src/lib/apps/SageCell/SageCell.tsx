/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React imports
import { useCallback, useRef, useEffect, useState, useMemo } from 'react';

// Chakra Imports
import {
  Accordion,
  AccordionItem,
  AccordionIcon,
  AccordionButton,
  AccordionPanel,
  Alert,
  Box,
  ButtonGroup,
  Code,
  Flex,
  Icon,
  IconButton,
  Image,
  Spacer,
  Spinner,
  Tooltip,
  Text,
  useColorModeValue,
  useToast,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  useDisclosure,
  Button,
} from '@chakra-ui/react';

// Icons
import { MdError, MdDelete, MdPlayArrow, MdStop } from 'react-icons/md';
import { VscRunAll } from 'react-icons/vsc';
import { FaPython } from 'react-icons/fa';

// Event Source import
import { fetchEventSource } from '@microsoft/fetch-event-source';

// Ansi library
import Ansi from 'ansi-to-react';
// Plotly library
import Plot, { PlotParams } from 'react-plotly.js';
// Vega library
import { Vega, VisualizationSpec } from 'react-vega';
// VegaLite library
import { VegaLite } from 'react-vega';
// Monaco Imports
import Editor, { useMonaco, OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { monacoOptions, monacoOptionsDrawer } from './components/monacoOptions';
// Yjs Imports

import { MonacoBinding } from 'y-monaco';
// Throttle
import { throttle } from 'throttle-debounce';

// SAGE3 Component imports
import {
  useAbility,
  apiUrls,
  useAppStore,
  useHexColor,
  useKernelStore,
  useUser,
  useUsersStore,
  useUIStore,
  useCursorBoardPosition,
  useYjs,
  serverTime,
  YjsRoomConnection,
  useThrottleScale,
} from '@sage3/frontend';
import { KernelInfo, ContentItem } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

// App Imports
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { ToolbarComponent, GroupedToolbarComponent, PdfViewer, Markdown, StatusBar } from './components';
import { App } from '../../schema';
import { useStore } from './components/store';

// Styling
import './SageCell.css';

/**
 * SageCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */

function AppComponent(props: App): JSX.Element {
  const { user } = useUser();
  if (!user) return <></>;

  // Abilties
  const canExecuteCode = useAbility('execute', 'kernels');

  // App state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  const fetchBoardApps = useAppStore((state) => state.fetchBoardApps);

  // Apps selection
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);

  // Store between app window and toolbar
  const drawer = useStore((state) => state.drawer[props._id]);
  const setDrawer = useStore((state) => state.setDrawer);
  const execute = useStore((state) => state.execute[props._id]);
  const interrupt = useStore((state) => state.interrupt[props._id]);
  const setExecute = useStore((state) => state.setExecute);
  const setInterrupt = useStore((state) => state.setInterrupt);
  const setKernel = useStore((state) => state.setKernel);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Styling
  const defaultTheme = useColorModeValue('vs', 'vs-dark');

  // Users
  const users = useUsersStore((state) => state.users);
  const userId = user?._id;
  const userInfo = users.find((u) => u._id === userId)?.data;
  const userColor = useHexColor(userInfo?.color as string);
  const [ownerColor, setOwnerColor] = useState<string>('#000000');

  // Room and Board info
  const roomId = props.data.roomId;
  const boardId = props.data.boardId;
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useThrottleScale(250);
  const { uiToBoard } = useCursorBoardPosition();

  // Local state
  const [cursorPosition, setCursorPosition] = useState({ r: 0, c: 0 });
  const [content, setContent] = useState<ContentItem[] | null>(null);
  const [executionCount, setExecutionCount] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(s.fontSize);

  // Toast
  const toast = useToast();
  const toastRef = useRef(false);

  // YJS and Monaco
  const { yApps } = useYjs();
  const monaco = useMonaco();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const editorRef2 = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Local state
  const [access, setAccess] = useState(true);
  const [selectedKernelName, setSelectedKernelName] = useState<string>('');

  // Styles
  const [editorHeight, setEditorHeight] = useState(350);
  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A'); // gray.100  gray.800
  const executionCountColor = useHexColor('red');

  // Kernel Store
  const apiStatus = useKernelStore((state) => state.apiStatus);
  const kernels = useKernelStore((state) => state.kernels);
  const executeCode = useKernelStore((state) => state.executeCode);
  const fetchResults = useKernelStore((state) => state.fetchResults);
  const interruptKernel = useKernelStore((state) => state.interruptKernel);

  // Memos and errors
  const renderedContent = useMemo(() => processedContent(content || []), [content]);
  const [error, setError] = useState<{ traceback?: string[]; ename?: string; evalue?: string } | null>(null);

  // Drawer size: user's preference from local storage or default
  const [drawerWidth, setDrawerWidth] = useState(localStorage.getItem('sage_preferred_drawer_width') || '50vw');

  useEffect(() => {
    // If the API Status is down, set the publicKernels to empty array
    if (!apiStatus) {
      setAccess(false);
      return;
    } else {
      const selectedKernel = kernels.find((kernel) => kernel.kernel_id === s.kernel);
      setSelectedKernelName(selectedKernel ? selectedKernel.alias : '');
      const isPrivate = selectedKernel?.is_private;
      const owner = selectedKernel?.owner;
      if (!isPrivate) setAccess(true);
      else if (isPrivate && owner === userId) setAccess(true);
      else setAccess(false);
    }
  }, [access, apiStatus, kernels, s.kernel]);

  /**
   * Update local state if the online status changes
   * @param {boolean} online
   */
  useEffect(() => {
    if (!apiStatus) {
      updateState(props._id, {
        streaming: false,
        kernel: '',
        msgId: '',
      });
    }
  }, [apiStatus]);

  // handle mouse move event
  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = e.movementY;
    handleEditorResize(deltaY);
  };

  // handle mouse up event
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleEditorResize = (deltaY: number) => {
    setEditorHeight((prevHeight) => {
      const newHeight = prevHeight + deltaY;
      // set the minimum height of the editor to 150px
      if (newHeight < 150) return 150;
      // set the maximum height of the editor to 50% of the window height
      if (newHeight > props.data.size.height * 0.8) return props.data.size.height * 0.8;
      return newHeight;
    }); // update the Monaco editor height
  };

  useEffect(() => {
    handleEditorResize(0);
  }, [props.data.size.height]);

  /**
   * Resizes the editor when the window is resized
   * or when the editorHeight changes.
   */
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.layout({
      width: props.data.size.width - 60,
      height: editorHeight && editorHeight > 150 ? editorHeight : 150,
      minHeight: '100%',
      minWidth: '100%',
    } as editor.IDimension);
  }, [props.data.size.width, editorHeight]);

  // Debounce Updates
  const throttleUpdate = throttle(1000, () => {
    if (!editorRef.current) return;
    updateState(props._id, { code: editorRef.current.getValue() });
  });

  // Keep a copy of the function
  const throttleFunc = useCallback(throttleUpdate, [editorRef.current]);

  /**
   * Executes the code in the editor
   * @returns void
   */
  const handleExecuteDrawer = async () => {
    // Copy the drawer code to the editor
    editorRef.current?.setValue(editorRef2.current?.getValue() || '');
    // Execute the code
    handleExecute();
  };

  const handleExecute = async () => {
    const canExec = SAGE3Ability.canCurrentUser('execute', 'kernels');
    if (!user || !editorRef.current || !apiStatus || !access || !canExec) return;
    updateState(props._id, { code: editorRef.current.getValue() });
    // Get the kernel from the store, since function executed from monoaco editor
    const kernel = useStore.getState().kernel[props._id];
    if (!kernel) {
      if (toastRef.current) return;
      toastRef.current = true;
      toast({
        title: 'No kernel selected',
        description: 'Please select a kernel from the toolbar',
        status: 'error',
        duration: 4000,
        isClosable: true,
        position: 'bottom',
        onCloseComplete: () => {
          toastRef.current = false;
        },
      });
      return;
    }
    if (kernel && !access) {
      if (toastRef.current) return;
      toastRef.current = true;
      toast({
        title: 'You do not have access to this kernel',
        description: 'Please select a different kernel from the toolbar',
        status: 'error',
        duration: 4000,
        isClosable: true,
        position: 'bottom',
        onCloseComplete: () => {
          toastRef.current = false;
        },
      });
      return;
    }
    if (editorRef.current.getValue() && editorRef.current.getValue().slice(0, 6) === '%%info') {
      const info = `sage_room_id = '${roomId}'\nsage_board_id = '${boardId}'\nsage_app_id = '${props._id}'\nprint('sage_room_id = ' + sage_room_id)\nprint('sage_board_id = ' + sage_board_id)\nprint('sage_app_id = ' + sage_app_id)`;
      editorRef.current.setValue(info);
    }
    try {
      const selectedAppsIds = useUIStore.getState().savedSelectedAppsIds;
      let code2execute = editorRef.current.getValue();
      code2execute = code2execute.replaceAll('%%sage_room_id', `'${roomId}'`);
      code2execute = code2execute.replaceAll('%%sage_board_id', `'${boardId}'`);
      code2execute = code2execute.replaceAll('%%sage_app_id', `'${props._id}'`);
      code2execute = code2execute.replaceAll('%%sage_selected_apps', `${JSON.stringify(selectedAppsIds)}`);
      const response = await executeCode(code2execute, kernel, user._id);
      if (response.ok) {
        const msgId = response.msg_id;
        updateState(props._id, {
          msgId: msgId,
          session: user._id,
        });
      } else {
        updateState(props._id, {
          streaming: false,
          msgId: '',
        });
      }
    } catch (error) {
      if (error instanceof TypeError) {
        console.log(`The Jupyter proxy server appears to be offline. (${error.message})`);
        updateState(props._id, {
          streaming: false,
          kernel: '',
          kernels: [],
          msgId: '',
        });
      }
    }
  };

  // Evaluate the sagecells in provenance (source) order
  // waitSeconds and executeAppNoChecks directly pulled from the toolbar.tsx, should consider some refactor strategy to resolve duplicated code
  async function waitSeconds(x: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, x * 1000));
  }

  const handleExecuteChain = async () => {
    async function executeAppNoChecks(appid: string, userid: string) {
      // Get the code from the store
      const code = useAppStore.getState().apps.find((app) => app._id === appid)?.data.state.code;
      console.log();
      // Get the kernel from the store, since function executed from monoaco editor
      const kernel = useStore.getState().kernel[appid];
      if (kernel && code) {
        const response = await useKernelStore.getState().executeCode(code, kernel, userid);
        if (response.ok) {
          const msgId = response.msg_id;
          useAppStore.getState().updateState(appid, { msgId: msgId, session: userid });
          return true;
        } else {
          useAppStore.getState().updateState(appid, { streaming: false, msgId: '' });
          return false;
        }
      }
      return false;
    }

    if (props.data.state.sources) {
      const allBoardApps = useAppStore.getState().apps;
      let source = props.data.state.sources[0];
      let appStack = [];

      // Push apps onto stack by following the first source of the provenance chain
      appStack.push(props);
      while (source) {
        const sourceApp = allBoardApps?.find((app) => app._id === source);
        if (!sourceApp) break;

        appStack.push(sourceApp);

        if (!sourceApp?.data?.state?.sources || sourceApp.data.state.sources.length === 0) {
          break;
        }

        source = sourceApp.data.state.sources[0];
      }

      // reverse through the stack (can also pop if you want) and execute the code as we go
      for (let i = appStack.length - 1; i >= 0; i--) {
        const app = appStack[i];
        const res = await executeAppNoChecks(app._id, app.data.state.session);
        // if error, break the loop
        if (!res) break;
        // Give illusion of sequential execution
        await waitSeconds(0.1);
      }
    } else {
      handleExecute();
    }
  };

  // Track the execute flag from the store in the toolbar
  useEffect(() => {
    if (execute) {
      handleExecute();
      setExecute(props._id, false);
    }
  }, [execute]);

  // Track the interrupt flag from the store in the toolbar
  useEffect(() => {
    if (interrupt) {
      handleInterrupt();
      setInterrupt(props._id, false);
    }
  }, [interrupt]);

  /**
   * Clears the code and the msgId from the state
   * and resets the editor to an empty string
   * @returns void
   */
  const handleClear = () => {
    if (!editorRef.current) return;

    // Clear the code in the backend
    updateState(props._id, {
      code: '',
      msgId: '',
      streaming: false,
    });

    const model = editorRef.current.getModel();
    if (model) {
      // Clear the cell editor
      editorRef.current.executeEdits('update-value', [
        {
          range: model.getFullModelRange(),
          text: '',
          forceMoveMarkers: false,
        },
      ]);
      // Ensure we are always operating on the same line endings
      model.setEOL(0);
    }
    if (!editorRef2.current) return;
    const model2 = editorRef2.current.getModel();
    if (model2) {
      // Clear the drawer editor
      editorRef2.current.executeEdits('update-value', [
        {
          range: model2.getFullModelRange(),
          text: '',
          forceMoveMarkers: false,
        },
      ]);
      // Ensure we are always operating on the same line endings
      model2.setEOL(0);
    }
  };

  // Handle interrupt
  const handleInterrupt = () => {
    // send signal to interrupt the kernel via http request
    interruptKernel(s.kernel);
    updateState(props._id, {
      msgId: '',
      streaming: false,
    });
  };

  // Insert room/board info into the editor
  const handleInsertInfo = (ed: editor.ICodeEditor) => {
    const info = `room_id = '${roomId}'\nboard_id = '${boardId}'\napp_id = '${props._id}'\n`;
    ed.focus();
    ed.trigger('keyboard', 'type', { text: info });
  };

  const handleInsertAPI = (ed: editor.ICodeEditor) => {
    let code = 'from foresight.config import config as conf, prod_type\n';
    code += 'from foresight.Sage3Sugar.pysage3 import PySage3\n';
    code += `sage_room_id = %%sage_room_id\nsage_board_id = %%sage_board_id\nsage_app_id = %%sage_app_id\nsage_selected_apps = %%sage_selected_apps\n`;
    code += 'ps3 = PySage3(conf, prod_type)\n\n';
    ed.focus();
    ed.setValue(code);
  };

  async function getResults(msgId: string) {
    if (s.streaming || s.msgId) return;
    const response = await fetchResults(msgId);
    if (response.ok) {
      const result = response.execOutput;
      if (result.msg_type === 'error') {
        setContent(null);
        setExecutionCount(0);
        const error = result.content.reduce((acc, item) => {
          if ('traceback' in item) {
            acc.traceback = item.traceback;
          }
          if ('ename' in item) {
            acc.ename = item.ename;
          }
          if ('evalue' in item) {
            acc.evalue = item.evalue;
          }
          return acc;
        }, {} as { traceback?: string[]; ename?: string; evalue?: string });
        setError(error);
        return;
      }
      if (result.completed) {
        setError(null);
        setContent(result.content);
        setExecutionCount(result.execution_count);
      }
    } else {
      setError({
        traceback: ['Error fetching results'],
        ename: 'Error',
        evalue: 'Error fetching results',
      });
      setContent(null);
      setExecutionCount(0);
    }
  }

  useEffect(() => {
    if (!s.history) return;
    if (s.history.length === 0 || s.streaming || s.msgId) return;
    const msgId = s.history[s.history.length - 1];
    getResults(msgId);
  }, [s.history]);

  useEffect(() => {
    function setEventSource() {
      // Controller to stop the event source if needed
      const ctrl = new AbortController();
      // Get the URL of the stream
      const streamURL = apiUrls.kernels.getMessageStream(s.msgId);
      // Fetch the evet source
      fetchEventSource(streamURL, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
        },
        signal: ctrl.signal,
        onmessage(event) {
          setError(null);
          if (!event.data) return;
          try {
            const parsedData = JSON.parse(event.data);
            setContent(parsedData.content);
            if (parsedData.execution_count) {
              setExecutionCount(parsedData.execution_count);
            }
          } catch (error) {
            console.log('EventSource> error', error);
            ctrl.abort();
          }
        },
        onclose() {
          updateState(props._id, { streaming: false, history: [...s.history, s.msgId], msgId: '' });
        },
      });
    }

    if (s.msgId && s.session === user?._id) {
      setEventSource();
    }
  }, [s.msgId]);

  function processedContent(content: ContentItem[]) {
    if (!content) return <></>;
    return content.map((item) => {
      return Object.keys(item).map((key) => {
        const value = item[key];
        switch (key) {
          // error messages are handled above
          case 'traceback':
          case 'ename':
          case 'evalue':
            return null;
          case 'stdout':
          case 'stderr':
            return <Ansi key={key}>{value as string}</Ansi>;
          case 'text/html':
            if (!value) return null; // hides other outputs if html is present
            // remove extra \n from html
            return <Box key={key} dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, '') }} />;
          case 'text/plain':
            if (item['text/html']) return null;
            return <Ansi key={key}>{value as string}</Ansi>;
          case 'image/png':
            return (
              <Image
                key={key}
                src={`data:image/png;base64,${value}`}
                onDragStart={(e) => {
                  // set the title in the drag transfer data
                  if (item['text/plain']) {
                    const title = item['text/plain'];
                    // remove the quotes from the title
                    e.dataTransfer.setData('title', title.slice(1, -1));
                  }
                }}
              />
            );
          case 'image/jpeg':
            return (
              <Image
                key={key}
                src={`data:image/jpeg;base64,${value}`}
                onDragStart={(e) => {
                  // set the title in the drag transfer data
                  if (item['text/plain']) {
                    const title = item['text/plain'];
                    // remove the quotes from the title
                    e.dataTransfer.setData('title', title.slice(1, -1));
                  }
                }}
              />
            );
          case 'image/svg+xml':
            return <Box key={key} dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, '') }} />;
          case 'text/markdown':
            return <Markdown key={key} data={value} openInWebview={openInWebview} />;
          case 'application/vnd.vegalite.v4+json':
          case 'application/vnd.vegalite.v3+json':
          case 'application/vnd.vegalite.v2+json':
            return <VegaLite key={key} spec={value as VisualizationSpec} actions={false} renderer="svg" />;
          case 'application/vnd.vega.v5+json':
          case 'application/vnd.vega.v4+json':
          case 'application/vnd.vega.v3+json':
          case 'application/vnd.vega.v2+json':
          case 'application/vnd.vega.v1+json':
            return <Vega key={key} spec={value as VisualizationSpec} actions={false} renderer="svg" />;
          case 'application/vnd.plotly.v1+json': {
            // Configure plotly
            const value = item[key] as unknown as PlotParams;
            const config = value.config || {};
            const layout = value.layout || {};
            config.displaylogo = false;
            config.displayModeBar = false;
            config.scrollZoom = false;
            config.showTips = false;
            config.showLink = false;
            config.linkText = 'Edit in Chart Studio';
            config.plotlyServerURL = `https://chart-studio.plotly.com`;
            config.responsive = true;
            config.autosizable = true;
            layout.dragmode = 'pan';
            layout.hovermode = 'closest';
            layout.showlegend = true;
            layout.font = { size: s.fontSize };
            layout.hoverlabel = {
              font: { size: s.fontSize },
            };
            layout.xaxis = {
              title: { font: { size: s.fontSize } },
              tickfont: { size: s.fontSize },
            };
            layout.yaxis = {
              title: { font: { size: s.fontSize } },
              tickfont: { size: s.fontSize },
            };
            layout.legend ? (layout.legend.font = { size: s.fontSize }) : (layout.legend = { font: { size: s.fontSize } });
            layout.margin = { l: 2, r: 2, b: 2, t: 2, pad: 2 };
            layout.paper_bgcolor = useColorModeValue(`#f4f4f4`, `#1b1b1b`);
            layout.plot_bgcolor = useColorModeValue(`#f4f4f4`, `#1b1b1b`);
            layout.height = window.innerHeight * 0.5;
            layout.width = window.innerWidth * 0.5;
            return (
              <>
                <Plot key={key} data={value.data} layout={layout} config={config} />
              </>
            );
          }
          case 'application/pdf':
            return <PdfViewer key={key} data={value as string} />;
          case 'application/json':
            return <pre key={key}>{JSON.stringify(value as string, null, 2)}</pre>;
          default:
            return (
              <Box key={key}>
                <Accordion allowToggle>
                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Text color={executionCountColor} fontSize={s.fontSize}>
                          Error: {key} is not supported in this version of SAGECell.
                        </Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <pre>{JSON.stringify(value as string, null, 2)}</pre>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </Box>
            );
        }
      });
    });
  }

  // Get the color of the kernel owner
  useEffect(() => {
    if (s.kernel && users) {
      const owner = kernels.find((el: KernelInfo) => el.kernel_id === s.kernel)?.owner;
      const ownerColor = users.find((el) => el._id === owner)?.data.color;
      setOwnerColor(ownerColor || '#000000');
    }
  }, [s.kernel, kernels, users]);

  /**
   * This function will create a new webview app
   * with the url provided
   *
   * @param url
   */
  const openInWebview = (url: string): void => {
    createApp({
      title: 'Webview',
      roomId: props.data.roomId,
      boardId: props.data.boardId,
      position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
      size: { width: 600, height: props.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Webview',
      state: { webviewurl: url },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  const connectToYjs = async (editor: editor.IStandaloneCodeEditor, yRoom: YjsRoomConnection) => {
    const yText = yRoom.doc.getText(props._id);
    const provider = yRoom.provider;
    // Ensure we are always operating on the same line endings
    const model = editor.getModel();
    if (model) model.setEOL(0);
    new MonacoBinding(yText, editor.getModel() as editor.ITextModel, new Set([editor]), provider.awareness);

    const users = provider.awareness.getStates();
    const count = users.size;
    // Sync current ydoc with that is saved in the database
    const syncStateWithDatabase = () => {
      // Clear any existing lines
      yText.delete(0, yText.length);
      // Set the lines from the database
      yText.insert(0, s.code);
    };

    // If I am the only one here according to Yjs, then sync with database
    if (count == 1) {
      syncStateWithDatabase();
    } else if (count > 1 && props._createdBy === user?._id) {
      // There are other users here and I created this app.
      // Is this app less than 5 seconds old...this feels hacky
      const now = await serverTime();
      const created = props._createdAt;
      // Then we need to sync with database due to Yjs not being able to catch the initial state
      if (now.epoch - created < 5000) {
        // I created this
        syncStateWithDatabase();
      }
    }
  };

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({ fontSize });
    // if (editorRef2.current) editorRef2.current.updateOptions({ fontSize });
    updateState(props._id, { fontSize });
  }, [fontSize]);

  useEffect(() => {
    setFontSize(s.fontSize);
  }, [s.fontSize]);

  const handleFontIncrease = () => {
    setFontSize((prev) => Math.min(48, prev + 2));
  };
  const handleFontDecrease = () => {
    setFontSize((prev) => Math.max(8, prev - 2));
  };
  const handleSaveCode = () => {
    if (editorRef2.current) {
      // Copy the drawer code to the editor in the board
      editorRef.current?.setValue(editorRef2.current.getValue());
    }
  };

  /**
   *
   * @param editor
   * @param monaco
   * @returns
   */
  const handleMount: OnMount = (editor, monaco) => {
    // set the editorRef
    editorRef.current = editor;

    // Connect to Yjs
    connectToYjs(editor, yApps!);

    // set the editor options
    editor.updateOptions({
      fontSize: s.fontSize,
      readOnly: !access || !apiStatus || !s.kernel,
    });
    // set the editor theme
    monaco.editor.setTheme(defaultTheme);
    // set the editor language
    monaco.editor.setModelLanguage(editor.getModel() as editor.ITextModel, 'python');
    // set the editor cursor position
    editor.setPosition({ lineNumber: cursorPosition.r, column: cursorPosition.c });
    // set the editor cursor selection
    editor.setSelection({
      startLineNumber: cursorPosition.r,
      startColumn: cursorPosition.c,
      endLineNumber: cursorPosition.r,
      endColumn: cursorPosition.c,
    });
    // set the editor layout
    editor.layout({
      width: props.data.size.width - 60,
      height: editorHeight && editorHeight > 150 ? editorHeight : 150,
      minHeight: '100%',
      minWidth: '100%',
    } as editor.IDimension);

    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({ r: e.position.lineNumber, c: e.position.column });
    });
    editor.addAction({
      id: 'execute',
      label: 'Cell Execute',
      contextMenuOrder: 0,
      contextMenuGroupId: '2_sage3',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
      run: handleExecute,
    });
    editor.addAction({
      id: 'interrupt',
      label: 'Cell Interrupt',
      contextMenuOrder: 1,
      contextMenuGroupId: '2_sage3',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
      run: handleInterrupt,
    });

    editor.addAction({
      id: 'setup_sage3',
      label: 'Setup SAGE API',
      contextMenuOrder: 0,
      contextMenuGroupId: '3_sagecell',
      run: handleInsertAPI,
    });
    editor.addAction({
      id: 'insert_vars',
      label: 'Insert Board Variables',
      contextMenuOrder: 1,
      contextMenuGroupId: '3_sagecell',
      run: handleInsertInfo,
    });
    editor.addAction({
      id: 'clear',
      label: 'Clear Cell',
      contextMenuOrder: 2,
      contextMenuGroupId: '3_sagecell',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
      run: handleClear,
    });

    editor.addAction({
      id: 'increaseFontSize',
      label: 'Increase Font Size',
      contextMenuOrder: 0,
      contextMenuGroupId: '4_font',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal],
      run: handleFontIncrease,
    });
    editor.addAction({
      id: 'decreaseFontSize',
      label: 'Decrease Font Size',
      contextMenuOrder: 1,
      contextMenuGroupId: '4_font',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus],
      run: handleFontDecrease,
    });

    // Update database on key up
    editor.onKeyUp((e) => {
      if (e.code === 'Escape') {
        // Deselect the app
        setSelectedApp('');
        return;
      }
      throttleFunc();
    });

    // Not in drawer to start
    setDrawer(props._id, false);
  };

  const handleMountDrawer: OnMount = (editor, monaco) => {
    // set the editorRef
    editorRef2.current = editor;

    // set the editor options
    editor.updateOptions({ readOnly: !access || !apiStatus || !s.kernel });
    // Default width and font size
    const preference = localStorage.getItem('sage_preferred_drawer_width');
    setDrawerWidth(preference || '50vw');

    // set the editor theme
    monaco.editor.setTheme(defaultTheme);
    // set the editor language
    monaco.editor.setModelLanguage(editor.getModel() as editor.ITextModel, 'python');
    // set the editor cursor position
    editor.setPosition({ lineNumber: cursorPosition.r, column: cursorPosition.c });
    // set the editor cursor selection
    editor.setSelection({
      startLineNumber: cursorPosition.r,
      startColumn: cursorPosition.c,
      endLineNumber: cursorPosition.r,
      endColumn: cursorPosition.c,
    });
    // set the editor layout
    editor.layout({
      width: props.data.size.width - 60,
      height: editorHeight && editorHeight > 150 ? editorHeight : 150,
      minHeight: '100%',
      minWidth: '100%',
    } as editor.IDimension);

    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({ r: e.position.lineNumber, c: e.position.column });
    });
    editor.addAction({
      id: 'execute',
      label: 'Cell Execute',
      contextMenuOrder: 0,
      contextMenuGroupId: '2_sage3',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
      run: handleExecuteDrawer,
    });
    editor.addAction({
      id: 'interrupt',
      label: 'Cell Interrupt',
      contextMenuOrder: 1,
      contextMenuGroupId: '2_sage3',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
      run: handleInterrupt,
    });
    editor.addAction({
      id: 'syncForServer',
      label: 'Cell Save',
      contextMenuOrder: 2,
      contextMenuGroupId: '2_sage3',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: handleSaveCode,
    });

    editor.addAction({
      id: 'setup_sage3',
      label: 'Setup SAGE API',
      contextMenuOrder: 0,
      contextMenuGroupId: '3_sagecell',
      run: handleInsertAPI,
    });
    editor.addAction({
      id: 'insert_vars',
      label: 'Insert Board Variables',
      contextMenuOrder: 1,
      contextMenuGroupId: '3_sagecell',
      run: handleInsertInfo,
    });
    editor.addAction({
      id: 'clear',
      label: 'Clear Cell',
      contextMenuOrder: 2,
      contextMenuGroupId: '3_sagecell',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
      run: handleClear,
    });

    editor.addAction({
      id: 'increaseFontSize',
      label: 'Increase Font Size',
      contextMenuOrder: 0,
      contextMenuGroupId: '4_font',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal],
      run: handleFontIncrease,
    });
    editor.addAction({
      id: 'decreaseFontSize',
      label: 'Decrease Font Size',
      contextMenuOrder: 1,
      contextMenuGroupId: '4_font',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus],
      run: handleFontDecrease,
    });

    // Update database on key up
    editor.onKeyUp((e) => {
      if (e.code === 'Escape') {
        // Deselect the app
        setSelectedApp('');
        closingDrawer();
        return;
      }
    });
  };

  /**
   * Put the kernel in the store, read from the action in Monaco
   */
  useEffect(() => {
    setKernel(props._id, s.kernel);
  }, [s.kernel]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({
      readOnly: !access || !apiStatus || !s.kernel,
    });
  }, [access, apiStatus, s.kernel]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({
      fontSize: s.fontSize,
    });
  }, [s.fontSize]);

  useEffect(() => {
    if (drawer) {
      onOpen();
      // If the right side of the app is beyond the center of the board, move the board
      const xw = props.data.position.x + props.data.size.width;
      let position = 1;
      if (drawerWidth === '25vw') {
        position = (3 * innerWidth) / 4;
      } else if (drawerWidth === '50vw') {
        position = innerWidth / 2;
      } else if (drawerWidth === '75vw') {
        position = innerWidth / 4;
      }
      const center = uiToBoard(position, innerHeight);
      if (xw > center.x) {
        const offset = xw - center.x + 10 / scale;
        setBoardPosition({ x: boardPosition.x - offset, y: boardPosition.y });
      }
    }
  }, [drawer]);

  const closingDrawer = () => {
    setDrawer(props._id, false);
    if (editorRef2.current) {
      // Copy the drawer code to the editor in the board
      editorRef.current?.setValue(editorRef2.current.getValue());
    }
    onClose();
  };

  const drawerEditor = (
    <Editor
      defaultValue={editorRef.current?.getValue()}
      loading={<Spinner />}
      options={canExecuteCode ? { ...monacoOptionsDrawer } : { ...monacoOptionsDrawer, readOnly: true }}
      onMount={handleMountDrawer}
      height={'100%'}
      width={'100%'}
      theme={defaultTheme}
      language={s.language}
    />
  );

  const make25W = () => {
    setDrawerWidth('25vw');
    // save the value in local storage, user's preference
    localStorage.setItem('sage_preferred_drawer_width', '25vw');
    const base = 6;
    const newFontsize = Math.round(Math.min(1.2 * base + (0.25 * innerWidth) / 100, 3 * base));
    if (editorRef2.current) editorRef2.current.updateOptions({ fontSize: newFontsize });
  };
  const make50W = () => {
    setDrawerWidth('50vw');
    // save the value in local storage, user's preference
    localStorage.setItem('sage_preferred_drawer_width', '50vw');
    const base = 6;
    const newFontsize = Math.round(Math.min(1.2 * base + (0.5 * innerWidth) / 100, 3 * base));
    if (editorRef2.current) editorRef2.current.updateOptions({ fontSize: newFontsize });
  };
  const make75W = () => {
    setDrawerWidth('75vw');
    // save the value in local storage, user's preference
    localStorage.setItem('sage_preferred_drawer_width', '75vw');
    const base = 6;
    const newFontsize = Math.round(Math.min(1.2 * base + (0.75 * innerWidth) / 100, 3 * base));
    if (editorRef2.current) editorRef2.current.updateOptions({ fontSize: newFontsize });
  };

  // Start dragging
  function OnDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  }
  // Drop event
  function OnDrop(event: React.DragEvent<HTMLDivElement>) {
    // Get the infos from the drag transfer data
    const ids = event.dataTransfer.getData('file');
    const types = event.dataTransfer.getData('type');
    if (editorRef.current) {
      const pos = editorRef.current.getPosition();
      if (pos) {
        // insert variables at the cursor position in the editor
        const text = `sage_assets_types = ${types}\nsage_assets_ids = ${ids}\n`;
        editorRef.current.focus();
        editorRef.current.trigger('keyboard', 'type', { text });
      }
    }
  }

  return (
    <AppWindow app={props} hideBackgroundIcon={FaPython}>
      <>
        <Drawer placement="right" variant="code" isOpen={isOpen} onClose={closingDrawer} closeOnOverlayClick={true}>
          <DrawerContent maxW={drawerWidth}>
            <DrawerCloseButton />
            <DrawerHeader p={1} m={1}>
              <Flex p={0} m={0}>
                <Text flex={1} mr={'10px'}>
                  SageCell
                </Text>
                <Box flex={2} width={'100px'} overflow={'clip'}>
                  <Text fontSize={'md'} pt={1} whiteSpace={'nowrap'} textOverflow={'ellipsis'}>
                    Use right-click for cell functions
                  </Text>
                </Box>
                <Tooltip hasArrow label="Small Editor">
                  <Button size={'sm'} p={2} m={'0 10px 0 10px'} onClick={make25W}>
                    25%
                  </Button>
                </Tooltip>
                <Tooltip hasArrow label="Medium Editor">
                  <Button size={'sm'} p={2} m={'0 10px 0 1px'} onClick={make50W}>
                    50%
                  </Button>
                </Tooltip>
                <Tooltip hasArrow label="Large Editor">
                  <Button size={'sm'} p={2} m={'0 40px 0 1px'} onClick={make75W}>
                    75%
                  </Button>
                </Tooltip>
              </Flex>
            </DrawerHeader>
            <DrawerBody p={0} m={0} boxSizing="border-box">
              <Box style={{ width: '100%', height: '100%' }} border="1px solid darkgray">
                {drawerEditor}
              </Box>
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        <Box className="sc" h={'calc(100% - 1px)'} w={'100%'} display="flex" flexDirection="column" backgroundColor={bgColor}>
          <StatusBar kernelName={selectedKernelName} access={access} online={apiStatus} rank={props.data.state.rank} />
          <Box
            w={'100%'}
            h={'100%'}
            display="flex"
            flex="1"
            flexDirection="column"
            whiteSpace={'pre-wrap'}
            overflowWrap="break-word"
            overflowY="auto"
            onDrop={OnDrop}
            onDragOver={OnDragOver}
          >
            <Flex direction={'row'}>
              {/* The editor status info (bottom) */}
              <Flex direction={'column'}>
                <Editor
                  loading={<Spinner />}
                  options={canExecuteCode ? { ...monacoOptions } : { ...monacoOptions, readOnly: true }}
                  onMount={handleMount}
                  height={editorHeight && editorHeight > 150 ? editorHeight : 150}
                  width={props.data.size.width - 60}
                  theme={defaultTheme}
                  language={s.language}
                />
                <Flex px={1} h={'24px'} fontSize={'16px'} color={userColor} justifyContent={'left'}>
                  {cursorPosition.r > 0 && cursorPosition.c > 0 ? `Ln: ${cursorPosition.r} Col: ${cursorPosition.c}` : null}
                  <Spacer />
                </Flex>
              </Flex>
              {/* The editor action panel (right side) */}
              <Box p={1}>
                <ButtonGroup isAttached variant="outline" size="lg" orientation="vertical">
                  <Tooltip hasArrow label="Execute" placement="right-start">
                    <IconButton
                      onClick={handleExecute}
                      aria-label={''}
                      icon={s.msgId ? <Spinner size="sm" color="teal.500" /> : <MdPlayArrow size={'1.5em'} color="#008080" />}
                      isDisabled={!s.kernel || !canExecuteCode}
                    />
                  </Tooltip>
                  <Tooltip hasArrow label="Execute all prior sage cells in this chain" placement="right-start">
                    <IconButton
                      onClick={handleExecuteChain}
                      aria-label={''}
                      icon={s.msgId ? <Spinner size="sm" color="teal.500" /> : <VscRunAll size={'1em'} color="#008080" />}
                      isDisabled={!s.kernel || !canExecuteCode}
                    />
                  </Tooltip>
                  <Tooltip hasArrow label="Stop" placement="right-start">
                    <IconButton
                      onClick={handleInterrupt}
                      aria-label={''}
                      isDisabled={!s.msgId || !canExecuteCode}
                      icon={<MdStop size={'1.5em'} color="#008080" />}
                    />
                  </Tooltip>
                  <Tooltip hasArrow label="Clear Cell" placement="right-start">
                    <IconButton
                      onClick={handleClear}
                      aria-label={''}
                      isDisabled={!s.kernel}
                      icon={<MdDelete size={'1.5em'} color="#008080" />}
                    />
                  </Tooltip>
                </ButtonGroup>
              </Box>
            </Flex>
            {/* The grab bar */}
            <Box
              className="grab-bar"
              onMouseDown={(e) => {
                e.preventDefault();
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
            {/* The output area */}
            <Box
              // height={window.innerHeight - editorHeight - 20 + 'px'}
              overflow={'scroll'}
              mr={'8px'}
              css={{
                '&::-webkit-scrollbar': {
                  background: `${bgColor}`,
                  width: '28px',
                  height: '2px',
                  // reserver space for scrollbar
                  scrollbarGutter: 'stable',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'teal',
                  borderRadius: '8px',
                },
              }}
            >
              <Flex align="start">
                {!executionCount || executionCount < 1 ? null : (
                  <Text padding="0.25rem" fontSize={s.fontSize} color={executionCountColor} marginRight="0.5rem">
                    [{executionCount}]:
                  </Text>
                )}
                <Box
                  flex="1"
                  borderLeft={`0.4rem solid ${useHexColor(ownerColor)}`}
                  p={1}
                  className={`output ${useColorModeValue('output-area-light', 'output-area-dark')}`}
                  fontSize={s.fontSize}
                >
                  {error && (
                    <Alert status="error">
                      <Icon as={MdError} />
                      <Code
                        style={{
                          fontFamily: 'monospace',
                          display: 'inline-block',
                          marginLeft: '0.5em',
                          marginRight: '0.5em',
                          fontWeight: 'bold',
                          background: 'transparent',
                          fontSize: s.fontSize,
                        }}
                      >
                        {error.ename}: <Ansi>{error.evalue}</Ansi>
                      </Code>
                    </Alert>
                  )}
                  {error?.traceback && error.traceback.map((line: string, idx: number) => <Ansi key={line + idx}>{line}</Ansi>)}
                  {renderedContent}
                </Box>
              </Flex>
              {/* End of Flex container */}
            </Box>
          </Box>
        </Box>
      </>
    </AppWindow>
  );
}

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

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
  Button,
  Code,
  Flex,
  Icon,
  IconButton,
  Image,
  Select,
  Spacer,
  Spinner,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';

// Icons
import { MdError, MdDelete, MdPlayArrow, MdStop, MdVerticalAlignTop, MdVerticalAlignCenter, MdVerticalAlignBottom } from 'react-icons/md';
import { VscRunAbove, VscRunAll, VscRunBelow } from 'react-icons/vsc';
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
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { monacoOptions } from './components/monacoOptions';
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
  useYjs,
  serverTime,
  YjsRoomConnection,
  useLinkStore,
} from '@sage3/frontend';
import { KernelInfo, ContentItem } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

// App Imports
import { App } from '../../schema';
import { useStore } from './components/store';
import { AppWindow } from '../../components';
import { state as AppState } from './index';
import { ToolbarComponent, GroupedToolbarComponent, PdfViewer, Markdown } from './components';
import { getRunOrderChain } from '../../appLinks';

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

  // Apps selection
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);

  // Store between app window and toolbar
  const execute = useStore((state) => state.execute[props._id]);
  const executeAll = useStore((state) => state.executeAll[props._id]);
  const interrupt = useStore((state) => state.interrupt[props._id]);
  const setExecute = useStore((state) => state.setExecute);
  const setExecuteAll = useStore((state) => state.setExecuteAll);
  const setInterrupt = useStore((state) => state.setInterrupt);
  const setKernel = useStore((state) => state.setKernel);

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
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Local state
  const [access, setAccess] = useState(true);
  const [selectedKernelName, setSelectedKernelName] = useState<string>('');
  const [isNarrow, setIsNarrow] = useState(false);

  // Styles
  const [editorHeight, setEditorHeight] = useState(200);
  const bgColor = useColorModeValue('white', '#1e1e1e'); // gray.100  gray.800
  const executionCountColor = useHexColor('red');
  const titleBarBgColor = useColorModeValue('gray.100', 'gray.800');
  const titleBarBgColorHex = useHexColor(titleBarBgColor);
  const titleBarBorderColor = useColorModeValue('gray.300', 'gray.700');
  const titleBarBorderColorHex = useHexColor(titleBarBorderColor);

  // Kernel Store
  const apiStatus = useKernelStore((state) => state.apiStatus);
  const kernels = useKernelStore((state) => state.kernels);
  const executeCode = useKernelStore((state) => state.executeCode);
  const fetchResults = useKernelStore((state) => state.fetchResults);
  const interruptKernel = useKernelStore((state) => state.interruptKernel);

  // Kernel selection logic
  const hasKernelAccess = (kernel: KernelInfo): boolean => {
    return !kernel.is_private || (kernel.is_private && kernel.owner === user?._id);
  };

  const filterMyKernels = (kernels: KernelInfo[]) => {
    return kernels.filter((kernel) => kernel.board === props.data.boardId && hasKernelAccess(kernel));
  };

  const myKernels = filterMyKernels(kernels);
  const selectedKernel = myKernels.find((kernel) => kernel.kernel_id === s.kernel);

  const selectKernel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKernelValue = e.target.value;
    updateState(props._id, { kernel: newKernelValue });
  };

  // Responsive behavior for narrow windows
  useEffect(() => {
    const checkWidth = () => {
      const focused = useUIStore.getState().focusedAppId === props._id;
      const currentWidth = focused ? window.innerWidth : props.data.size.width;
      setIsNarrow(currentWidth < 850);
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);

    return () => window.removeEventListener('resize', checkWidth);
  }, [props.data.size.width]);


  // Memos and errors
  const renderedContent = useMemo(() => processedContent(content || []), [content]);
  const [error, setError] = useState<{ traceback?: string[]; ename?: string; evalue?: string } | null>(null);

  // Drawer size: user's preference from local storage or default
  // const [drawerWidth, setDrawerWidth] = useState(localStorage.getItem('sage_preferred_drawer_width') || '50vw');

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

  // Watch the kernel changes to update the Editor language
  useEffect(() => {
    const selectedKernel = kernels.find((kernel) => kernel.kernel_id === s.kernel);
    if (selectedKernel) {
      const language = selectedKernel.name === 'python3' ? 'python' : selectedKernel.name === 'ir' ? 'r' : 'julia';
      updateState(props._id, { language });
    }
  }, [s.kernel]);

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

  // Simplified resize handler
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();

    const startY = e.clientY;
    const startHeight = editorHeight;
    const scale = useUIStore.getState().scale;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = (e.clientY / scale) - (startY / scale);
      const newHeight = startHeight + deltaY;
      const focused = useUIStore.getState().focusedAppId === props._id;
      const maxHeight = props.data.size.height - 108;

      setEditorHeight(Math.max(0, Math.min(newHeight, maxHeight)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Quick positioning functions
  const handlePositionTop = () => {
    setEditorHeight(0);
  };

  const handlePositionMiddle = () => {
    setEditorHeight(props.data.size.height / 2);
  };

  const handlePositionBottom = () => {
    setEditorHeight(props.data.size.height - 108);
  };



  // Monaco editor layout - handle both width and height
  useEffect(() => {
    if (!editorRef.current) return;
    const width = props.data.size.width;
    editorRef.current.layout({ width, height: editorHeight });
  }, [props.data.size.width, editorHeight]);

  // Adjust editor height when app size changes to prevent grab bar from disappearing
  useEffect(() => {
    const maxHeight = props.data.size.height - 108; // Account for toolbar and bottom bar
    if (editorHeight > maxHeight) {
      setEditorHeight(Math.max(0, maxHeight));
    }
  }, [props.data.size.height, editorHeight]);

  // Debounce Updates
  const throttleUpdate = throttle(1000, () => {
    if (!editorRef.current) return;
    updateState(props._id, { code: editorRef.current.getValue() });
  });

  // Keep a copy of the function
  const throttleFunc = useCallback(throttleUpdate, [editorRef.current]);

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

  ////// Todo: temporary proof of concept block...
  // Evaluate the sagecells in provenance (source) order
  // waitSeconds and executeAppNoChecks directly pulled from the toolbar.tsx, should consider some refactor strategy to resolve duplicated code
  async function waitSeconds(x: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, x * 1000));
  }

  const handleExecuteChain = async (type: 'up' | 'down' | 'all') => {
    async function executeAppNoChecks(appid: string) {
      // Get the code from the store
      const code = useAppStore.getState().apps.find((app) => app._id === appid)?.data.state.code;
      const userId = user?._id;
      const kernel = useStore.getState().kernel[appid];

      if (kernel && code && userId) {
        const response = await executeCode(code, kernel, userId);
        if (response.ok) {
          const msgId = response.msg_id;
          useAppStore.getState().updateState(appid, { msgId: msgId, session: userId });
          return true;
        } else {
          useAppStore.getState().updateState(appid, { streaming: false, msgId: '' });
          return false;
        }
      }
      return false;
    }

    const allBoardApps: App[] = JSON.parse(JSON.stringify(useAppStore.getState().apps)); // deep copy
    const links = useLinkStore.getState().links;

    const run_order_appIds = getRunOrderChain(props._id, links);
    // flip the order of the array to execute the apps in reverse order
    run_order_appIds.reverse();
    // If the type is up, only get the apps upstream, if down, only get the apps downstream, if all no change
    if (type === 'down') {
      const idx = run_order_appIds.indexOf(props._id);
      run_order_appIds.splice(idx + 1, run_order_appIds.length - idx - 1);
    } else if (type === 'up') {
      const idx = run_order_appIds.indexOf(props._id);
      run_order_appIds.splice(0, idx);
    }

    for (let i = run_order_appIds.length - 1; i >= 0; i--) {
      const app = allBoardApps.find((a) => a._id === run_order_appIds[i]);
      if (!app) break;
      const res = await executeAppNoChecks(app._id);
      // if error, break the loop
      if (!res) break;
      // Give illusion of sequential execution
      await waitSeconds(0.1);
    }
  };

  // Track the execute flag from the store in the toolbar
  useEffect(() => {
    if (execute) {
      handleExecute();
      setExecute(props._id, false);
    }
  }, [execute]);

  // Track the execute flag from the store in the toolbar
  useEffect(() => {
    if (executeAll && executeAll.exec) {
      handleExecuteChain(executeAll.type);
      setExecuteAll(props._id, false, 'all');
    }
  }, [executeAll]);

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
          case 'image/png':
            return (
              <Image
                key={key}
                src={`data:image/png;base64,${value}`}
                onDragStart={(e) => {
                  // Set the title in the drag transfer data
                  let title = "SAGEcell Output";
                  if (item['text/plain']) {
                    title = item['text/plain'];
                    // Remove the quotes from the title
                    title = title.replace(/[<>]/g, "");
                  }
                  const data = JSON.stringify({ title, sources: [props._id] });
                  e.dataTransfer.setData('app_state', data);
                }}
              />
            );
          case 'image/jpeg':
            return (
              <Image
                key={key}
                src={`data:image/jpeg;base64,${value}`}
                onDragStart={(e) => {
                  // Set the title in the drag transfer data
                  let title = "SAGEcell Output";
                  if (item['text/plain']) {
                    title = item['text/plain'];
                    // Remove the quotes from the title
                    title = title.replace(/[<>]/g, "");
                  }
                  const data = JSON.stringify({ title, sources: [props._id] });
                  e.dataTransfer.setData('app_state', data);
                }}
              />
            );
          case 'text/html':
            if (!value) return null; // hides other outputs if html is present
            // remove extra \n from html
            return <Box key={key} dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, '') }} />;
          case 'text/plain':
            if (item['text/html']) return null;
            return <Ansi key={key}>{value as string}</Ansi>;
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

    // Set the editor layout
    const isFocused = useUIStore.getState().focusedAppId === props._id;
    const editorWidth = props.data.size.width;
    editor.layout({
      width: editorWidth,
      height: editorHeight,
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
        // Unfocus the app
        useUIStore.getState().setFocusedAppId('');
        return;
      }
      throttleFunc();
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
        <Box className="sc" h="100%" w={'100%'} display="flex" flexDirection="column" backgroundColor={bgColor}>

          {/* Toolbar at the top */}
          <Box p={2} borderBottom="1px solid" backgroundColor={titleBarBgColor} borderColor={titleBarBorderColor} >
            <Flex gap={2} align="center">
              {/* Editor label */}
              <Text fontSize="xl" fontWeight="bold" mx="2">
                SAGECell
              </Text>

              {/* Execution Buttons */}

              <Button
                onClick={handleExecute}
                leftIcon={!isNarrow ? (s.msgId ? <Spinner size="sm" /> : <MdPlayArrow size="16px" />) : undefined}
                isDisabled={!s.kernel || !canExecuteCode}
                size="xs"
                variant="ghost"
                title="Run"
              >
                {isNarrow ? (s.msgId ? <Spinner size="sm" /> : <MdPlayArrow size="16px" />) : 'Run'}
              </Button>
              <Button
                onClick={() => handleExecuteChain('all')}
                leftIcon={!isNarrow ? (s.msgId ? <Spinner size="sm" /> : <VscRunAll size="16px" />) : undefined}
                isDisabled={!s.kernel || !canExecuteCode}
                size="xs"
                variant="ghost"
                title="Run All"
              >
                {isNarrow ? (s.msgId ? <Spinner size="sm" /> : <VscRunAll size="16px" />) : 'All'}
              </Button>
              <Button
                onClick={() => handleExecuteChain('up')}
                leftIcon={!isNarrow ? (s.msgId ? <Spinner size="sm" /> : <VscRunAbove size="16px" />) : undefined}
                isDisabled={!s.kernel || !canExecuteCode}
                size="xs"
                variant="ghost"
                title="Run To Here"
              >
                {isNarrow ? (s.msgId ? <Spinner size="sm" /> : <VscRunAbove size="16px" />) : 'To Here'}
              </Button>
              <Button
                onClick={() => handleExecuteChain('down')}
                leftIcon={!isNarrow ? (s.msgId ? <Spinner size="sm" /> : <VscRunBelow size="16px" />) : undefined}
                isDisabled={!s.kernel || !canExecuteCode}
                size="xs"
                variant="ghost"
                title="From Here"
              >
                {isNarrow ? (s.msgId ? <Spinner size="sm" /> : <VscRunBelow size="16px" />) : 'From Here'}
              </Button>
              <Button
                onClick={handleInterrupt}
                leftIcon={!isNarrow ? <MdStop size="16px" /> : undefined}
                isDisabled={!s.msgId || !canExecuteCode}
                size="xs"
                variant="ghost"
                title="Stop"
              >
                {isNarrow ? <MdStop size="16px" /> : 'Stop'}
              </Button>
              <Button
                onClick={handleClear}
                leftIcon={!isNarrow ? <MdDelete size="16px" /> : undefined}
                isDisabled={!s.kernel}
                size="xs"
                variant="ghost"
                title="Clear"
              >
                {isNarrow ? <MdDelete size="16px" /> : 'Clear'}
              </Button>

              {/* Kernel Selector */}
              <Box minW={isNarrow ? "100px" : "180px"}>
                {myKernels.length === 0 ? (
                  <Button size="sm" colorScheme="teal" variant="outline" isDisabled>
                    {!isNarrow && 'No Kernels'}
                  </Button>
                ) : (
                  <Select
                    placeholder={isNarrow ? "Kernel" : "Select Kernel"}
                    size="md"
                    value={selectedKernel?.kernel_id || ''}
                    onChange={selectKernel}
                    backgroundColor={bgColor}
                    height="33px"

                  >
                    {myKernels.map((kernel) => (
                      <option key={kernel.kernel_id} value={kernel.kernel_id}>
                        {isNarrow ? kernel.alias : `${kernel.alias} (${kernel.name})`}
                      </option>
                    ))}
                  </Select>
                )}
              </Box>

            </Flex>
          </Box>

          <Box
            w={'100%'}
            h={'100%'}
            display="grid"
            gridTemplateRows={`${editorHeight}px 5px 1fr`}
            whiteSpace={'pre-wrap'}
            overflowWrap="break-word"
            onDrop={OnDrop}
            onDragOver={OnDragOver}
          >
            {/* Editor area */}
            <Box h="100%" w="100%" display="flex" flexDirection="column">
              <Box flex="1"  w="100%">
                <Editor
                  loading={<Spinner />}
                  options={canExecuteCode ? { ...monacoOptions } : { ...monacoOptions, readOnly: true }}
                  onMount={handleMount}
                  height="100%"
                  width="100%"
                  theme={defaultTheme}
                  language={s.language}
                />
              </Box>
              <Flex px={1} h={'24px'} fontSize={'16px'} color={userColor} justifyContent={'left'} w="100%">
                {cursorPosition.r > 0 && cursorPosition.c > 0 ? `Ln: ${cursorPosition.r} Col: ${cursorPosition.c}` : null}
                <Spacer />
              </Flex>
            </Box>

            {/* The output area */}
            <Box>
              <Box
                px="2"
                py="1"
                backgroundColor={titleBarBgColor}
                onMouseDown={handleResizeStart}
                css={{
                  cursor: 'row-resize',
                  userSelect: 'none',
                }}
                height="32px"
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                borderBottom="1px solid"
                borderTop="1px solid"
                borderColor={titleBarBorderColorHex}
              >
                <Text fontSize="xl" fontWeight="bold" mx="2">
                  Output
                </Text>

                {/* Positioning buttons - centered */}
                <Flex gap={1} position="absolute" left="50%" transform="translateX(-50%)">
                  <IconButton
                    size="xs"
                    variant="ghost"
                    icon={<MdVerticalAlignTop size="14px" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePositionTop();
                    }}
                    title="Editor to Top (80%)"
                    aria-label="Move editor to top"
                  />
                  <IconButton
                    size="xs"
                    variant="ghost"
                    icon={<MdVerticalAlignCenter size="14px" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePositionMiddle();
                    }}
                    title="Editor to Middle (50%)"
                    aria-label="Move editor to middle"
                  />
                  <IconButton
                    size="xs"
                    variant="ghost"
                    icon={<MdVerticalAlignBottom size="14px" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePositionBottom();
                    }}
                    title="Editor to Bottom (20%)"
                    aria-label="Move editor to bottom"
                  />
                </Flex>
              </Box>


              <Box w="100%" h="100%" display="flex">
                <Box w="32px" h="100%" backgroundColor="transparent"></Box>
                <Box
                  h={`calc(${props.data.size.height}px - ${editorHeight}px - 44px - 52px)`}
                  w="100%"
                  p={1}
                  fontSize={s.fontSize}
                  overflow={'auto'}
                  mr={'6px'}
                  css={{
                    '&::-webkit-scrollbar': {
                      width: '16px',
                      background: 'transparent',
                    },
                    '&::-webkit-scrollbar-track': {
                      width: '16px',
                      background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: titleBarBgColorHex,
                      borderRadius: '8px',
                    },
                  }}
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
              </Box>
              {/* End of Flex container */}
            </Box>
          </Box>

          {/* Fixed bottom info bar */}
          <Box
            px={2}
            py={1}
            borderTop="1px solid"
            borderColor={titleBarBorderColorHex}
            backgroundColor={titleBarBgColor}
            height="28px"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            fontSize="xs"
            color="gray.600"
            _dark={{ color: "gray.400" }}
          >
            <Text>
              {selectedKernel ? `${selectedKernel.alias} (${selectedKernel.name})` : 'No kernel selected'}
            </Text>
            <Text>
              {cursorPosition.r > 0 && cursorPosition.c > 0 ? `Ln ${cursorPosition.r}, Col ${cursorPosition.c}` : ''}
            </Text>
          </Box>
        </Box>
      </>
    </AppWindow>
  );
}

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

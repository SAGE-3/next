/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React imports
import { useCallback, useRef } from 'react';
import { Monaco } from '@monaco-editor/react';

// Event Source import
import { fetchEventSource } from '@microsoft/fetch-event-source';

// Chakra Imports
import {
  useToast,
  Flex,
  Box,
  ButtonGroup,
  IconButton,
  Spinner,
  Tooltip,
  Spacer,
  Text,
  useColorModeValue,
  Alert,
  Image,
  Icon,
  Code,
  Accordion,
  AccordionItem,
  AccordionIcon,
  AccordionButton,
  AccordionPanel,
} from '@chakra-ui/react';
import { MdError, MdClearAll, MdPlayArrow, MdStop } from 'react-icons/md';

// Monaco Imports
import { useMonaco } from '@monaco-editor/react';
import Editor from '@monaco-editor/react';

// import * as monaco from '@monaco-editor/react';
import { monacoOptions } from './components/monacoOptions';

// Yjs Imports
import { MonacoBinding } from 'y-monaco';

import { useYjs } from '@sage3/frontend';

import { throttle } from 'throttle-debounce';

// App Imports
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';

// Componet imports
import { ToolbarComponent } from './components';

// Styling
import './SageCell.css';
import { Badge, Stack } from '@chakra-ui/react';

import { useEffect, useState, useMemo } from 'react';

// Ansi library
import Ansi from 'ansi-to-react';
// Markdown library
import { Markdown } from './components/markdown';
// Plotly library
import Plot, { PlotParams } from 'react-plotly.js';
// Vega library
import { Vega, VisualizationSpec } from 'react-vega';
// VegaLite library
import { VegaLite } from 'react-vega';
// PdfViewer
import { PdfViewer } from './components/pdfviewer';

import { useAppStore, useHexColor, useKernelStore, useUser, useUsersStore } from '@sage3/frontend';

import { KernelInfo, ContentItem } from '@sage3/shared/types';
import { editor } from 'monaco-editor';

/**
 * SageCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */

function AppComponent(props: App): JSX.Element {
  const { user } = useUser();
  if (!user) return <></>;

  // App state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // const [fontSize, setFontSize] = useState(s.fontSize);

  // Styling
  const defaultTheme = useColorModeValue('vs', 'vs-dark');

  // Users
  const users = useUsersStore((state) => state.users);
  const userId = user?._id;
  const userInfo = users.find((u) => u._id === userId)?.data;
  const userName = userInfo?.name;
  const userColor = useHexColor(userInfo?.color as string);
  const [ownerColor, setOwnerColor] = useState<string>('#000000');

  // Room and Board info
  const roomId = props.data.roomId;
  const boardId = props.data.boardId;

  // Local state
  const [numClients, setNumClients] = useState<number>(0);
  const [cursorPosition, setCursorPosition] = useState({ r: 0, c: 0 });
  const [content, setContent] = useState<ContentItem[] | null>(null);
  const [executionCount, setExecutionCount] = useState<number>(0);

  // Toast
  const toast = useToast();
  const toastRef = useRef(false);

  // YJS and Monaco
  const { provider, yText } = useYjs(props._id);
  const monaco = useMonaco();
  // const editorRef = useRef<HTMLDivElement | null>(null);
  // const [model, setModel] = useState<editor.ITextModel | null>(null);
  // const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [binding, setBinding] = useState<MonacoBinding | null>(null);

  // Local state
  const [access, setAccess] = useState(true);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Styles
  const [editorHeight, setEditorHeight] = useState(150);
  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A'); // gray.100  gray.800
  const green = useHexColor('green');
  const yellow = useHexColor('yellow');
  const red = useHexColor('red');
  const executionCountColor = useHexColor('red');
  const accessDeniedColor = useHexColor('red');
  const accessAllowColor = useHexColor('green');

  // Kernel Store
  const { apiStatus, kernels, executeCode, fetchResults, interruptKernel } = useKernelStore((state) => state);
  const [selectedKernelName, setSelectedKernelName] = useState<string>('');

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

  useEffect(() => {
    if (!editorRef.current || !provider || !yText) return;
    if (binding) binding.destroy();
    if (binding == null) {
      const model = editorRef.current.getModel() as editor.ITextModel;
      provider.awareness.setLocalStateField('user', {
        name: userName,
        color: userColor,
      });
      // destroy the binding when the editor is destroyed
      provider.awareness.on('change', () => {
        // Update cursor colors based on user color
        const states = provider.awareness.getStates();
        // get a list of the number of unique clients in the room
        for (const [clientId, state] of states.entries()) {
          // Ignore local client state
          if (clientId !== provider.awareness.clientID) {
            // Create new style element
            const style = document.createElement('style');
            style.id = `style-${clientId}`;
            // Apply user color and name to CSS
            const css = `
                .yRemoteSelection-${clientId} {
                  background-color: ${state.user.color} !important;
                  margin-left: -1px;
                  margin-right: -1px;
                  pointer-events: none;
                  position: relative;
                  word-break: normal;
                }

                .yRemoteSelection-${clientId} {
                  border-left: 1px solid ${state.user.color} !important;
                  border-right: 1px solid ${state.user.color} !important;
                }

                .monaco-editor-overlaymessage {
                  transform: scale(0.8);
                }
              `;
            style.appendChild(document.createTextNode(css));
            // Remove old style element if it exists
            const oldStyle = document.getElementById(`style-${clientId}`);
            if (oldStyle) {
              document.head.removeChild(oldStyle);
            }
            // Append the style element to the document head
            document.head.appendChild(style);
          }
        }
        // Update the number of clients in the room
        setNumClients(states.size);
      });
      setBinding(new MonacoBinding(yText, model, new Set([editorRef.current]), provider.awareness));
    }
    return () => {
      if (binding) binding.destroy();
      if (editorRef.current) editorRef.current.dispose();
    };
  }, []);

  /**
   * Update local state if the online status changes
   * @param {boolean} online
   */
  useEffect(() => {
    if (!apiStatus) {
      if (eventSource) eventSource.close();
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

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({
      fontSize: s.fontSize,
    });
  }, [s.fontSize]);

  // // Debounce Updates
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
  const handleExecute = async () => {
    if (!user || !editorRef.current || !apiStatus || !access) return;
    if (!s.kernel) {
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
    if (s.kernel && !access) {
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
      const info = `room_id = '${roomId}'\nboard_id = '${boardId}'\nprint('room_id = ' + room_id)\nprint('board_id = ' + board_id)`;
      editorRef.current.setValue(info);
    }
    try {
      const response = await executeCode(editorRef.current.getValue(), s.kernel, user._id);
      if (response.ok) {
        const msgId = response.msg_id;
        updateState(props._id, {
          msgId: msgId,
          session: user._id,
        });
      } else {
        // console.log('Error executing code');
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

  /**
   * Clears the code and the msgId from the state
   * and resets the editor to an empty string
   * @returns void
   */
  const handleClear = () => {
    if (eventSource) eventSource.close();
    if (!editorRef.current) return;
    updateState(props._id, {
      code: '',
      msgId: '',
      streaming: false,
    });
    editorRef.current?.setValue('');
  };

  // Handle interrupt
  const handleInterrupt = () => {
    // send signal to interrupt the kernel via http request
    if (eventSource)
      eventSource.close(),
        updateState(props._id, {
          msgId: '',
          streaming: false,
        });
    interruptKernel(s.kernel);
  };

  async function getResults(msgId: string) {
    if (s.streaming || s.msgId) return;
    if (eventSource) eventSource.close();
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
        // } else {
        //   console.log('Message not completed: ', result);
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
    if (s.history.length === 0 || s.streaming || s.msgId) return;
    const msgId = s.history[s.history.length - 1];
    getResults(msgId);
  }, [s.history]);

  useEffect(() => {
    function setEventSource() {
      const ctrl = new AbortController();
      fetchEventSource(`/api/fastapi/status/${s.msgId}/stream`, {
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

  const renderedContent = useMemo(() => processedContent(content || []), [content]);
  const [error, setError] = useState<{ traceback?: string[]; ename?: string; evalue?: string } | null>(null);

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
            return <Image key={key} src={`data:image/png;base64,${value}`} />;
          case 'image/jpeg':
            return <Image key={key} src={`data:image/jpeg;base64,${value}`} />;
          case 'image/svg+xml':
            return <Box key={key} dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, '') }} />;
          case 'text/markdown':
            // return <Markdown key={key} data={value} />;
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
            // Open a iframe with the pdf
            return <PdfViewer key={key} data={value as string} />;
          case 'application/json':
            // Render the json as string into a PRE tag
            return <pre key={key}>{JSON.stringify(value as string, null, 2)}</pre>;
          // case 'application/javascript':
          //   const code = value as string;

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
    });
  };
  function handleEditorDidMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
    // setIsEditorReady(true);
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({ r: e.position.lineNumber, c: e.position.column });
      // only save the the code user is typing
      if (e.reason === 3) {
        throttleFunc();
      }
    });
    editor.addAction({
      id: 'execute',
      label: 'Execute',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
      run: handleExecute,
    });
    editor.addAction({
      id: 'clear',
      label: 'Clear',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
      run: handleClear,
    });
    editor.addAction({
      id: 'interrupt',
      label: 'Interrupt',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
      run: handleInterrupt,
    });
    editor.layout({
      width: props.data.size.width - 60,
      height: editorHeight && editorHeight > 150 ? editorHeight : 150,
      minHeight: '100%',
      minWidth: '100%',
    } as editor.IDimension);
    editor.updateOptions({
      fontSize: s.fontSize,
    });
    editor.updateOptions({
      readOnly: !access || !apiStatus || !s.kernel,
    });
  }

  /**
   * Needs to be reset every time the kernel changes
   */
  useEffect(() => {
    if (editorRef.current && s.kernel && apiStatus && access && !s.msgId && monaco) {
      editorRef.current.addAction({
        id: 'execute',
        label: 'Execute',
        keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
        run: handleExecute,
      });
    }
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

  return (
    <AppWindow app={props}>
      <Box className="sc" h={'calc(100% - 1px)'} w={'100%'} display="flex" flexDirection="column" backgroundColor={bgColor}>
        <Box w={'100%'} borderBottom={`5px solid ${access ? accessAllowColor : accessDeniedColor}`}>
          <Stack direction="row" p={1}>
            {!apiStatus ? (
              <></>
            ) : (
              <Badge variant="ghost" color={selectedKernelName ? green : yellow} textOverflow={'ellipsis'} width="200px">
                {selectedKernelName ? `Kernel: ${selectedKernelName}` : 'No Kernel Selected'}
              </Badge>
            )}

            <Spacer />
            {apiStatus ? ( // no kernel selected and no access
              <Badge variant="ghost" color={green}>
                Online
              </Badge>
            ) : (
              <Badge variant="ghost" color={red}>
                Offline
              </Badge>
            )}
          </Stack>
        </Box>
        <Box
          w={'100%'}
          h={'100%'}
          display="flex"
          flex="1"
          flexDirection="column"
          whiteSpace={'pre-wrap'}
          overflowWrap="break-word"
          overflowY="auto"
        >
          <Flex direction={'row'}>
            {/* The editor status info (bottom) */}
            <Flex direction={'column'}>
              <Editor
                loading={<Spinner />}
                options={monacoOptions}
                defaultValue={s.code}
                className="monaco-editor"
                onMount={handleEditorDidMount}
                height={editorHeight && editorHeight > 150 ? editorHeight : 150}
                width={props.data.size.width - 60}
                theme={defaultTheme}
                language={s.language}
              />

              {/* <div ref={editorRef} /> */}
              <Flex px={1} h={'24px'} fontSize={'16px'} color={userColor} justifyContent={'left'}>
                {numClients > 1 ? 'Online:' + numClients : null}
                <Spacer />
                {cursorPosition.r > 0 && cursorPosition.c > 0 ? `Ln: ${cursorPosition.r} Col: ${cursorPosition.c}` : null}
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
                    isDisabled={!s.kernel}
                  />
                </Tooltip>
                <Tooltip hasArrow label="Stop" placement="right-start">
                  <IconButton
                    onClick={handleInterrupt}
                    aria-label={''}
                    isDisabled={!s.msgId}
                    icon={<MdStop size={'1.5em'} color="#008080" />}
                  />
                </Tooltip>
                <Tooltip hasArrow label="Clear Cell" placement="right-start">
                  <IconButton
                    onClick={handleClear}
                    aria-label={''}
                    isDisabled={!s.kernel}
                    icon={<MdClearAll size={'1.5em'} color="#008080" />}
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
            height={window.innerHeight - editorHeight - 20 + 'px'}
            overflow={'scroll'}
            css={{
              '&::-webkit-scrollbar': {
                background: `${bgColor}`,
                width: '6px',
                height: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'teal',
                borderRadius: '24px',
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
    </AppWindow>
  );
}

export default { AppComponent, ToolbarComponent };

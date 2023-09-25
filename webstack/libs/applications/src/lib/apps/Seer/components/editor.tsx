/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React imports
import { useCallback, useRef, useEffect, useState } from 'react';

// Monaco Imports
import Editor, { useMonaco, OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

// Throttle
import { throttle } from 'throttle-debounce';

// App Imports
import { state as AppState } from '../index';
import { App } from '../../../schema';

import { useAbility, useAppStore, useHexColor, useKernelStore, useUser, useUsersStore } from '@sage3/frontend';
import { SAGE3Ability } from '@sage3/shared';

type YjsClientState = {
  name: string;
  color: string;
};

import { useColorModeValue, useToast, Flex, Box, ButtonGroup, IconButton, Spinner, Tooltip } from '@chakra-ui/react';
import { MdClearAll, MdPlayArrow, MdStop } from 'react-icons/md';

type CodeEditorProps = {
  app: App;
  access: boolean; // Does this user have access to the sagecell's selected kernel
  editorHeight?: number;
  online: boolean;
};

/**
 *
 * @param props
 * @returns
 */
export function CodeEditor(props: CodeEditorProps): JSX.Element {
  const { user } = useUser();
  if (!user) return <></>;

  // Abilties
  // const canExecuteCode = useAbility('execute', 'kernels');

  // App state
  const s = props.app.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Styling
  const defaultTheme = useColorModeValue('vs', 'vs-dark');

  // Users
  const users = useUsersStore((state) => state.users);
  const userId = user?._id;
  const userInfo = users.find((u) => u._id === userId)?.data;
  const userName = userInfo?.name;
  const userColor = useHexColor(userInfo?.color as string);

  // Room and Board info
  const roomId = props.app.data.roomId;
  const boardId = props.app.data.boardId;

  // Local state
  const [cursorPosition, setCursorPosition] = useState({ r: 0, c: 0 });
  // const [content, setContent] = useState<ContentItem[] | null>(null);
  // const [executionCount, setExecutionCount] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(s.fontSize);

  // Toast
  const toast = useToast();
  const toastRef = useRef(false);

  // YJS and Monaco
  const monaco = useMonaco();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  // const [binding, setBinding] = useState<MonacoBinding | null>(null);
  const monacoOptions: editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    glyphMargin: false,
    automaticLayout: true,
    wordWrap: 'off',
    lineNumbers: 'on',
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 3,
    quickSuggestions: false,
    renderLineHighlight: 'all',
    scrollBeyondLastLine: false,
    fontFamily: "'Source Code Pro', 'Menlo', 'Monaco', 'Consolas', 'monospace'",
    fontSize: s.fontSize,
    scrollbar: {
      useShadows: true,
      verticalHasArrows: true,
      horizontalHasArrows: true,
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize: 18,
      horizontalScrollbarSize: 18,
      arrowSize: 30,
    },
    readOnly: !props.access,
  };

  const [yProvider, setYProvider] = useState<WebsocketProvider | null>(null);
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  // const [yText, setYText] = useState<Y.Text | null>(null);

  const [peers, setPeers] = useState<Map<number, YjsClientState>>(new Map());

  // Local state
  const [access, setAccess] = useState(true);

  // Styles
  // const [editorHeight, setEditorHeight] = useState(140);
  // const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A'); // gray.100  gray.800
  // const green = useHexColor('green');
  // const yellow = useHexColor('yellow');
  // const red = useHexColor('red');
  // const executionCountColor = useHexColor('red');
  // const accessDeniedColor = useHexColor('red');
  // const accessAllowColor = useHexColor('green');

  // Kernel Store
  const { apiStatus, kernels, executeCode, interruptKernel } = useKernelStore((state) => state);
  // const [selectedKernelName, setSelectedKernelName] = useState<string>('');

  useEffect(() => {
    if (!yProvider) return;
    yProvider.awareness.on('change', () => {
      const states = yProvider.awareness.getStates();
      const peers = new Map(states) as Map<number, YjsClientState>;
      for (const [clientId, state] of states.entries()) {
        if (clientId !== yProvider.awareness.clientID) {
          const style = document.createElement('style');
          style.id = `style-${clientId}`;
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
            `;
          style.appendChild(document.createTextNode(css));
          const oldStyle = document.getElementById(`style-${clientId}`);
          if (oldStyle) {
            document.head.removeChild(oldStyle);
          }
          document.head.appendChild(style);
        }
      }
      if (yDoc) {
        peers.delete(yDoc.clientID);
      }
      setPeers(peers);
    });

    return () => {
      if (yProvider) yProvider.disconnect();
      if (yProvider && peers.size < 1) yProvider.destroy();
    };
  }, [yProvider]);

  useEffect(() => {
    // If the API Status is down, set the publicKernels to empty array
    if (!apiStatus) {
      setAccess(false);
      return;
    } else {
      const selectedKernel = kernels.find((kernel) => kernel.kernel_id === s.kernel);
      // setSelectedKernelName(selectedKernel ? selectedKernel.alias : '');
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
      updateState(props.app._id, {
        streaming: false,
        kernel: '',
        msgId: '',
      });
    }
  }, [apiStatus]);

  // Debounce Updates
  const throttleUpdate = throttle(1000, () => {
    if (!editorRef.current) return;
    updateState(props.app._id, { code: editorRef.current.getValue() });
  });

  // Keep a copy of the function
  const throttleFunc = useCallback(throttleUpdate, [editorRef.current]);

  /**
   * Executes the code in the editor
   * @returns void
   */
  const handleExecute = async () => {
    const canExec = SAGE3Ability.canCurrentUser('execute', 'kernels');
    if (!user || !editorRef.current || !apiStatus || !access || !canExec) return;
    updateState(props.app._id, { code: editorRef.current.getValue() });
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
        updateState(props.app._id, {
          msgId: msgId,
          session: user._id,
        });
      } else {
        // console.log('Error executing code');
        updateState(props.app._id, {
          streaming: false,
          msgId: '',
        });
      }
    } catch (error) {
      if (error instanceof TypeError) {
        console.log(`The Jupyter proxy server appears to be offline. (${error.message})`);
        updateState(props.app._id, {
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
    if (!editorRef.current) return;
    updateState(props.app._id, {
      code: '',
      msgId: '',
      streaming: false,
    });
    editorRef.current?.setValue('');
  };

  // Handle interrupt
  const handleInterrupt = () => {
    // send signal to interrupt the kernel via http request
    interruptKernel(s.kernel);
    updateState(props.app._id, {
      msgId: '',
      streaming: false,
    });
  };

  // Insert room/board info into the editor
  const handleInsertInfo = (ed: editor.ICodeEditor) => {
    const info = `room_id = '${roomId}'\nboard_id = '${boardId}'\n`;
    ed.focus();
    ed.trigger('keyboard', 'type', { text: info });
  };
  const handleInsertAPI = (ed: editor.ICodeEditor) => {
    let code = 'from foresight.config import config as conf, prod_type\n';
    code += 'from foresight.Sage3Sugar.pysage3 import PySage3\n';
    code += `room_id = '${roomId}'\nboard_id = '${boardId}'\n`;
    code += 'ps3 = PySage3(conf, prod_type)\n\n';
    ed.focus();
    ed.setValue(code);
  };

  // Get the color of the kernel owner
  // useEffect(() => {
  //   if (s.kernel && users) {
  //     const owner = kernels.find((el: KernelInfo) => el.kernel_id === s.kernel)?.owner;
  //     const ownerColor = users.find((el) => el._id === owner)?.data.color;
  //     setOwnerColor(ownerColor || '#000000');
  //   }
  // }, [s.kernel, kernels, users]);

  const connectToYjs = (editor: editor.IStandaloneCodeEditor) => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

    const doc = new Y.Doc();
    const yText = doc.getText('monaco');
    const provider = new WebsocketProvider(`${protocol}://${window.location.host}/yjs`, props.app._id, doc);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const binding = new MonacoBinding(yText, editor.getModel() as editor.ITextModel, new Set([editor]), provider.awareness);
    // setBinding(binding);
    setYProvider(provider);
    setYDoc(doc);
    // setYText(yText);

    provider.awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
    });

    provider.on('sync', () => {
      const users = provider.awareness.getStates();
      const count = users.size;
      // I'm the only one here, so need to sync current ydoc with that is saved in the database
      if (count == 1) {
        // Does the board have lines?
        if (s.code) {
          // Clear any existing lines
          yText.delete(0, yText.length);
          // Set the lines from the database
          yText.insert(0, s.code);
        }
      }
    });
  };

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({ fontSize });
    updateState(props.app._id, { fontSize });
  }, [fontSize]);

  useEffect(() => {
    setFontSize(s.fontSize);
  }, [s.fontSize]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({
      fontSize: s.fontSize,
    });
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
    connectToYjs(editor);

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
    // editor.layout({
    //   width: props.data.size.width - 75,
    //   height: editorHeight && editorHeight > 140 ? editorHeight : 140,
    //   minHeight: '100%',
    //   minWidth: '100%',
    // } as editor.IDimension);

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
      id: 'clear',
      label: 'Cell Clear',
      contextMenuOrder: 1,
      contextMenuGroupId: '2_sage3',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
      run: handleClear,
    });
    editor.addAction({
      id: 'interrupt',
      label: 'Cell Interrupt',
      contextMenuOrder: 2,
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
    editor.onKeyUp(() => {
      throttleFunc();
    });
  };

  /**
   * Needs to be reset every time the kernel changes
   */
  useEffect(() => {
    if (editorRef.current && s.kernel && apiStatus && access && !s.msgId && monaco) {
      editorRef.current.addAction({
        id: 'execute',
        label: 'Cell Execute',
        contextMenuOrder: 0,
        contextMenuGroupId: '2_sage3',
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

  return (
    <>
      <Flex direction={'row'}>
        <Editor
          defaultValue={s.code} // code to initialize the editor with
          language={s.language} // language of the editor
          options={monacoOptions}
          height={150}
          width={props.app.data.size.width - 60}
          theme={defaultTheme}
          onMount={handleMount}
        />
        <Box p={1}>
          <ButtonGroup isAttached variant="outline" size="lg" orientation="vertical">
            <Tooltip hasArrow label="Execute" placement="right-start">
              <IconButton
                onClick={handleExecute}
                aria-label={''}
                icon={s.streaming ? <Spinner size="sm" color="teal.500" /> : <MdPlayArrow size={'1.5em'} color="#008080" />}
                isDisabled={!s.kernel}
              />
            </Tooltip>
            <Tooltip hasArrow label="Stop" placement="right-start">
              <IconButton
                onClick={handleInterrupt}
                aria-label={''}
                isDisabled={!s.kernel || s.streaming}
                icon={<MdStop size={'1.5em'} color="#008080" />}
              />
            </Tooltip>
            <Tooltip hasArrow label="Clear All" placement="right-start">
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
    </>
  );
}

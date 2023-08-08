/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React imports
import { useEffect, useState } from 'react';

// Chakra Imports
import { useColorModeValue, useToast, Flex, Box, ButtonGroup, IconButton, Spinner, Tooltip, Spacer } from '@chakra-ui/react';
import { MdClearAll, MdPlayArrow, MdStop } from 'react-icons/md';

// Monaco Imports
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

// SAGE3 imports
import { useHexColor, useKernelStore, useAppStore, useUser, useUsersStore, FastAPI } from '@sage3/frontend';

// App Imports
import { state as AppState } from '../index';
import { App } from '../../../schema';

// Code Editor Props
type CodeEditorProps = {
  app: App;
  access: boolean; // Does this user have access to the sagecell's selected kernel
  editorHeight?: number;
  online: boolean;
};

/**
 * Editor component for the SageCell application
 * @param props
 * @returns
 */
export function CodeEditor(props: CodeEditorProps): JSX.Element {
  // App State
  const s = props.app.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Styling
  const defaultTheme = useColorModeValue('vs', 'vs-dark');

  // Users
  const users = useUsersStore((state) => state.users);
  const { user } = useUser();
  const userId = user?._id;
  const userInfo = users.find((u) => u._id === userId)?.data;
  const userName = userInfo?.name;
  const userColor = useHexColor(userInfo?.color as string);

  // Room and Board info
  const roomId = props.app.data.roomId;
  const boardId = props.app.data.boardId;

  // Local state
  const [fontSize, setFontSize] = useState(s.fontSize);
  const [numClients, setNumClients] = useState<number>(0);
  const [cursorPosition, setCursorPosition] = useState({ r: 0, c: 0 });

  // YJS and Monaco
  const [provider, setProvider] = useState<WebsocketProvider>();
  const [binding, setBinding] = useState<MonacoBinding>();
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();

  // Kernel Store
  const { apiStatus } = useKernelStore((state) => state);

  // Toast
  const toast = useToast();

  const monacoOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    glyphMargin: false,
    automaticLayout: false, // this is needed to make the editor resizeable
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

  const onEditorDidMount: OnMount = (editor, monaco) => {
    // sets the initial size of the editor manually since automaticLayout is set to false
    editor.layout({
      width: props.app.data.size.width - 60,
      height: props.editorHeight && props.editorHeight > 150 ? props.editorHeight : 150,
      minHeight: '100%',
      minWidth: '100%',
    } as monaco.editor.IDimension);

    // actions
    editor.addAction({
      id: 'execute',
      label: 'Execute',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
      run: handleExecute,
    });
    editor.addAction({
      id: 'increase-font-size',
      label: 'Increase Font Size',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal],
      run: () => {
        setFontSize((prevSize) => prevSize + 1);
      },
    });
    editor.addAction({
      id: 'decrease-font-size',
      label: 'Decrease Font Size',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus],
      run: () => {
        setFontSize((prevSize) => prevSize - 1);
      },
    });
    editor.addAction({
      id: 'reset-font-size',
      label: 'Reset Font Size',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR],
      run: () => {
        setFontSize(s.fontSize);
      },
    });
    editor.addAction({
      id: 'save',
      label: 'Save',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        const text = editor.getValue();
        if (text) {
          updateState(props.app._id, { code: text });
          console.log('saving code');
        }
      },
    });
    setEditor(editor);
  };

  useEffect(() => {
    if (editor && !binding && !provider) {
      const ydoc = new Y.Doc();
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const provider = new WebsocketProvider(`${protocol}://${window.location.host}/yjs`, props.app._id, ydoc);
      const yText = ydoc.getText('monaco');
      const model = editor.getModel() as monaco.editor.ITextModel;

      provider.awareness.setLocalStateField('user', {
        id: user?._id,
        name: userName,
        color: userColor,
      });

      provider.awareness.setLocalStateField('cursor', {
        position: editor.getPosition(),
        selection: editor.getSelection(),
      });

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
      setProvider(provider);
      setBinding(new MonacoBinding(yText, model, new Set([editor]), provider.awareness));
    }

    return () => {
      if (binding) binding.destroy();
      if (provider) provider?.disconnect();
      setBinding(undefined);
      setProvider(undefined);
    };
  }, [editor]);

  useEffect(() => {
    editor?.updateOptions({
      fontSize: fontSize,
    });
  }, [fontSize]);

  /**
   * Saves the code to the database every 5 seconds
   * TODO: Fix this to save as debounce instead of throttle
   * @param value
   * @param event
   * @returns
   */
  const handleChange: OnChange = (value, event) => {
    editor?.onDidChangeCursorPosition((ev) => {
      setCursorPosition({ r: ev.position.lineNumber, c: ev.position.column });
    });
    if (numClients > 1) return;
    if (event.changes.length > 10) {
      const text = editor?.getValue();
      if (text) {
        const updateDelta = Date.now() - props.app._updatedAt;
        // console.log('delta', delta);
        if (updateDelta > 500) {
          console.log('saving code ' + updateDelta);
          // saves code roughly every 1 second
          updateState(props.app._id, { code: text });
        }
      }
    }
  };

  const handleExecute = async () => {
    if (!user || !editor || !apiStatus || !props.access) return;
    const userId = user._id;
    if (editor) {
      if (!s.kernel && !s.msgId) {
        toast({
          title: 'No kernel selected',
          description: 'Please select a kernel from the toolbar',
          status: 'error',
          duration: 4000,
          isClosable: true,
          position: 'bottom',
        });
        return;
      }
      if (!s.kernel) {
        toast({
          title: 'You do not have access to this kernel',
          description: 'Please select a different kernel from the toolbar',
          status: 'error',
          duration: 4000,
          isClosable: true,
          position: 'bottom',
        });
        return;
      }
      if (editor.getValue() && editor.getValue().slice(0, 6) === '%%info') {
        const info = `room_id = '${roomId}'\nboard_id = '${boardId}'\nprint('room_id = ' + room_id)\nprint('board_id = ' + board_id)`;
        editor.setValue(info);
      }
      try {
        const response = await FastAPI.executeCode(editor.getValue(), s.kernel, user._id);
        if (response.ok) {
          const msgId = response.msg_id;
          console.log(msgId);
          updateState(props.app._id, {
            streaming: true,
            msgId: msgId,
          });
        } else {
          console.log('Error executing code');
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
    }
  };

  /**
   * Clears the code and the msgId from the state
   * and resets the editor to an empty string
   * @returns void
   */
  const handleClear = () => {
    updateState(props.app._id, {
      code: '',
      msgId: '',
      streaming: false,
      executeInfo: { executeFunc: '', params: {} },
    });
    editor?.setValue('');
  };

  // Handle interrupt
  const handleInterrupt = () => {
    if (!user) return;
    // send signal to interrupt the kernel via http request
    FastAPI.interruptKernel(s.kernel);
    updateState(props.app._id, {
      streaming: false,
      msgId: '',
    });
  };

  /**
   * Needs to be reset every time the kernel changes
   */
  useEffect(() => {
    if (editor && s.kernel && props.access) {
      editor.addAction({
        id: 'execute',
        label: 'Execute',
        keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
        run: handleExecute,
      });
    }
  }, [s.kernel, props.access]);

  /**
   * Resizes the editor when the window is resized
   * or when the editorHeight changes.
   *
   * This is needed because the editor is not responsive
   * and automaticLayout is set to false to make the editor
   * resizeable and not trigger a ResizeObserver loop limit
   * exceeded error.
   */
  useEffect(() => {
    if (editor) {
      editor.layout({
        width: props.app.data.size.width - 60,
        height: props.editorHeight && props.editorHeight > 150 ? props.editorHeight : 150,
        minHeight: 150,
        minWidth: 150,
      } as monaco.editor.IDimension);
    }
  }, [editor, props.app.data.size.width, props.editorHeight]);

  return (
    <>
      <Flex direction={'row'}>
        <Editor
          defaultValue={s.code} // code to initialize the editor with
          language={s.language} // language of the editor
          options={monacoOptions}
          theme={defaultTheme}
          onMount={onEditorDidMount}
          onChange={handleChange}
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
                isDisabled={!s.streaming}
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
      <Flex px={1} h={'24px'} fontSize={'16px'} color={userColor} justifyContent={'left'}>
        {numClients > 1 ? 'Online:' + numClients : null}
        <Spacer />
        {cursorPosition.r > 0 && cursorPosition.c > 0 ? `Line: ${cursorPosition.r} Column: ${cursorPosition.c}` : null}
      </Flex>
    </>
  );
}

/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import { useColorModeValue, useToast, Flex, Box, ButtonGroup, IconButton, Spinner, Tooltip, Spacer } from '@chakra-ui/react';
import { MdClearAll, MdPlayArrow, MdStop } from 'react-icons/md';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

import { truncateWithEllipsis, useHexColor } from '@sage3/frontend';

import { useAppStore, useUser, useUsersStore } from '@sage3/frontend';
import { state as AppState } from '../index';
import { App } from '../../../schema';

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
  const s = props.app.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
  const baseURL = 'http://localhost:81';
  const defaultTheme = useColorModeValue('vs', 'vs-dark');
  const users = useUsersStore((state) => state.users);
  // get users currently active on this board

  const { user } = useUser();
  const userId = user?._id;
  const userInfo = users.find((u) => u._id === userId)?.data;
  const userName = userInfo?.name;
  const userColor = useHexColor(userInfo?.color as string);
  const [fontSize, setFontSize] = useState(s.fontSize);
  const [numClients, setNumClients] = useState<number>(0);
  const [cursorPosition, setCursorPosition] = useState({ r: 0, c: 0 });
  const [msgId, setMsgId] = useState<string>(s.msgId);
  const toast = useToast();
  const white = useHexColor('white');
  const roomId = props.app.data.roomId;
  const boardId = props.app.data.boardId;

  useEffect(() => {
    if (!props.online) {
      console.log('The Jupyter proxy server appears to be offline.');
      updateState(props.app._id, {
        streaming: false,
        kernel: '',
        kernels: [],
        msgId: '',
      });
    }
  }, [props.online]);

  // function getPositionAt(text: string, offset: number): monaco.IPosition {
  //   const lines = text.split('\n');
  //   let pos = 0;
  //   for (const [i, line] of lines.entries()) {
  //     if (offset < pos + line.length + 1) {
  //       return new monaco.Position(i + 1, offset - pos + 1);
  //     }
  //     pos += line.length + 1;
  //   }
  //   throw new Error(`offset ${offset} out of bounds in text of length ${text.length}`);
  // }

  const monacoOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
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

  /**
   *
   * @param editor
   * @param monaco
   * @returns
   */
  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    editorRef.current.addAction({
      id: 'increase-font-size',
      label: 'Increase Font Size',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal],
      run: () => {
        setFontSize((prevSize) => prevSize + 1);
      },
    });

    editorRef.current?.addAction({
      id: 'decrease-font-size',
      label: 'Decrease Font Size',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus],
      run: () => {
        setFontSize((prevSize) => prevSize - 1);
      },
    });

    editorRef.current?.addAction({
      id: 'reset-font-size',
      label: 'Reset Font Size',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Numpad0],
      run: () => {
        setFontSize(s.fontSize);
      },
    });

    editorRef.current?.addAction({
      id: 'save',
      label: 'Save',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        const text = editorRef.current?.getValue();
        if (text) {
          updateState(props.app._id, { code: text });
        }
      },
    });

    editorRef.current?.addAction({
      id: 'execute',
      label: 'Execute',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
      run: handleExecute,
    });

    const ydoc = new Y.Doc();
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const provider = new WebsocketProvider(`${protocol}://${window.location.host}/yjs`, props.app._id, ydoc);
    const yText = ydoc.getText('monaco');
    const model = editor.getModel() as monaco.editor.ITextModel;
    const binding = new MonacoBinding(yText, model, new Set([editor]), provider.awareness);

    provider.awareness.setLocalStateField('user', {
      id: user?._id,
      name: userName,
      color: userColor,
    });
    provider.awareness.setLocalStateField('cursor', {
      position: editor.getPosition(),
      selection: editor.getSelection(),
    });
    provider.awareness.on('status', (event: { status: 'disconnected' | 'connecting' | 'connected' }) => {
      console.log(event.status); // logs "connected" or "disconnected"
    });
    provider.awareness.on('change', () => {
      // update the css for the cursor based on the user's color
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
            .yRemoteSelection {
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

            // .yRemoteSelection-${clientId}::before {
            //   content: '${truncateWithEllipsis(state.user.name, 6)}';
            //   position: absolute;
            //   top: -${s.fontSize}px;
            //   left: 0;
            //   padding: 0 0.25rem;
            //   font-size: 0.75rem;
            //   line-height: 0.9rem;
            //   color: ${state.user.color};
            //   background-color: ${white};
            //   border-radius: 4px;
            //   border: 1px solid ${state.user.color};
            //   pointer-events: none;
            // }

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

      if (provider.awareness.getStates().size !== numClients) {
        const uniqueClients = new Set(states.keys());
        // const activeUsers = Array.from(uniqueClients).map((id) => states.get(id)?.user.id);
        // console.log('activeUsers', activeUsers);
        setNumClients(provider.awareness.getStates().size);
      }
    });

    return () => {
      binding.destroy();
      provider?.disconnect();
    };
  };

  useEffect(() => {
    editorRef.current?.updateOptions({
      fontSize: fontSize,
    });
  }, [fontSize]);

  useEffect(() => {
    console.log('numClients', numClients);
    // do something drastic if there are too many authors
    if (numClients > 4) {
      // set the editor to read only
      editorRef.current?.updateOptions({
        readOnly: true,
      });
    } else {
      editorRef.current?.updateOptions({
        readOnly: !props.access,
      });
    }
  }, [numClients]);

  /**
   * Saves the code to the database every 5 seconds
   * if the code has changed since the last update
   * and there is only one client
   *
   * @param value
   * @param event
   * @returns
   */
  const handleChange: OnChange = (value, event) => {
    editorRef.current?.onDidChangeCursorPosition((ev: any) => {
      setCursorPosition({ r: ev.position.lineNumber, c: ev.position.column });
    });
    if (numClients > 1) return;
    if (event.changes.length > 0) {
      const text = editorRef.current?.getValue();
      if (text) {
        const updateDelta = Date.now() - props.app._updatedAt;
        // console.log('delta', delta);
        if (updateDelta > 1000) {
          // saves code roughly every 1 second
          updateState(props.app._id, { code: text });
        }
      }
    }
  };

  // useEffect(() => {
  //   if (!user) return;
  //   const userId = user._id;
  //   if (s.kernels) {
  //     const updatedKernels = s.kernels.reduce((accumulatedKernels, kernel) => {
  //       if (kernel.room === roomId && kernel.board === boardId && (!kernel.is_private || (kernel.is_private && kernel.owner === userId))) {
  //         accumulatedKernels.push(kernel);
  //       }
  //       return accumulatedKernels;
  //     }, [] as KernelInfo[]);
  //     // const kernel = updatedKernels.find((kernel) => kernel.kernel_id === s.kernel);
  //     // if (kernel) {
  //     //   console.log('kernel', kernel);
  //     // }
  //     // console.log('s.kernel', s.kernel);
  //   }
  // }, [JSON.stringify(s.kernels), s.kernel]);

  const handleExecute = async () => {
    if (!user || editorRef.current?.getValue() === '' || !editorRef.current || !props.online) return;
    updateState(props.app._id, {
      streaming: true,
    });
    const userId = user._id;
    if (editorRef.current) {
      // THIS LOGIC IS ALL SCREWED UP
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
      if (editorRef.current.getValue() && editorRef.current.getValue().slice(0, 6) === '%%info') {
        const info = `room_id = '${roomId}'\nboard_id = '${boardId}'\nprint('room_id = ' + room_id)\nprint('board_id = ' + board_id)`;
        editorRef.current.setValue(info);
      }
      try {
        const response = await fetch(`${baseURL}/execute/${s.kernel}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: editorRef.current.getValue(),
            session: userId,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          // console.log(data);
          if (data.msg_id) {
            setMsgId(data.msg_id);
            console.log('msg_id', data.msg_id);
          }
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
   * Updates the state with the msgId if it has changed
   * @returns void
   */
  useEffect(() => {
    if (msgId !== s.msgId)
      updateState(props.app._id, {
        msgId: msgId,
      });
  }, [msgId]);

  /**
   * Clears the code and the msgId from the state
   * and resets the editor to an empty string
   * @returns void
   */
  const handleClear = () => {
    updateState(props.app._id, {
      code: '',
      msgId: '',
    });
    editorRef.current?.setValue('');
  };

  // Handle interrupt
  const handleInterrupt = () => {
    if (!user) return;
    // send signal to interrupt the kernel via http request
    fetch(`${baseURL}/interrupt/${s.kernel}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: user?._id,
      }),
    });
  };

  /**
   * TRYING TO GET MONACO TO WORK ON SHIFT-ENTER KEYBINDING
   */
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.addAction({
        id: 'execute',
        label: 'Execute',
        keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
        run: handleExecute,
      });
    }
  }, [s.kernel]);

  return (
    <>
      <Flex direction={'row'}>
        <Editor
          defaultValue={s.code} // code to initialize the editor with
          language={s.language} // language of the editor
          options={monacoOptions}
          height={props.editorHeight && props.editorHeight > 150 ? props.editorHeight : 150}
          width={props.app.data.size.width - 60}
          theme={defaultTheme}
          onMount={handleMount}
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
      <Flex px={1} h={'24px'} fontSize={'16px'} color={userColor} justifyContent={'left'}>
        {numClients > 1 ? 'Online:' + numClients : null}
        <Spacer />
        {cursorPosition.r > 0 && cursorPosition.c > 0 ? `Line: ${cursorPosition.r} Column: ${cursorPosition.c}` : null}
      </Flex>
    </>
  );
}

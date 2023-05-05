/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import { Box, ButtonGroup, HStack, IconButton, Spacer, Spinner, Tooltip, useColorMode, useToast } from '@chakra-ui/react';
import { MdClearAll, MdPlayArrow, MdStop } from 'react-icons/md';
import Editor, { Monaco, useMonaco } from '@monaco-editor/react';
import { v4 as getUUID } from 'uuid';

import { useAppStore, useUser } from '@sage3/frontend';
import { state as AppState } from '../index';
import { App } from '../../../schema';

// Debounce updates to the editor
import { debounce } from 'throttle-debounce';

type CodeEditorProps = {
  app: App;
  access: boolean; // Does this user have access to the sagecell's selected kernel
};

/**
 *
 * @param props
 * @returns
 */
export const CodeEditor = (props: CodeEditorProps): JSX.Element => {
  const s = props.app.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  // Reference to the editor
  const editor = useRef<Monaco>();
  const [code, setCode] = useState<string>(s.code);
  const { user } = useUser();
  const { colorMode } = useColorMode();
  const [fontSize, setFontSize] = useState(s.fontSize);
  // Make a toast to show errors
  const toast = useToast();
  // Handle to the Monoco API
  const monaco = useMonaco();
  // const [myKernels, setMyKernels] = useState<{ value: Record<string, any>; key: string }[]>([]);
  const [myKernels, setMyKernels] = useState(s.availableKernels);
  const [access, setAccess] = useState<boolean>(false);
  const [kernel, setKernel] = useState(s.kernel);
  const roomId = props.app.data.roomId;
  const boardId = props.app.data.boardId;

  // Saving the text after 1.5sec of inactivity
  const debounceSave = useRef(
    debounce(1500, (val) => {
      updateState(props.app._id, { code: val });
    })
  );

  const debounceIsTyping = useRef(
    debounce(3000, () => {
      updateState(props.app._id, { isTyping: false });
    })
  );

  const handleCodeChange = (value: string | undefined) => {
    if (value != undefined) {
      setCode(value);
      // Update the text when not typing
      debounceSave.current(value);
    }
  };

  // set isTyping to true if anyone begins typing, and false after 1 second of inactivity
  const handleIsTyping = () => {
    if (s.isTyping) return;
    updateState(props.app._id, { isTyping: true });
    debounceIsTyping.current();
  };

  useEffect(() => {
    if (code !== s.code) {
      handleIsTyping();
    }
  }, [code]);

  useEffect(() => {
    if (s.code !== code) {
      setCode(s.code);
    }
  }, [s.code]);

  useEffect(() => {
    // Get all kernels that I'm available to see
    const kernels: any[] = [];
    s.availableKernels
      // filter kernels to show this board kernels only
      .filter((kernel) => kernel.value.board === boardId)
      // filter kernels to show pulic or private kernels that I own
      .forEach((kernel) => {
        if (kernel.value.is_private) {
          if (kernel.value.owner_uuid == user?._id) {
            kernels.push(kernel);
          }
        } else {
          kernels.push(kernel);
        }
      });
    setMyKernels(kernels);
  }, [JSON.stringify(s.availableKernels)]);

  // Check if I have access to the selected kernel
  useEffect(() => {
    if (!s.kernel || s.kernel === '') {
      setAccess(false);
    } else {
      const access = myKernels.find((kernel) => kernel.key == s.kernel);
      setAccess(access ? true : false);
    }
  }, [s.kernel, myKernels]);

  useEffect(() => {
    if (editor.current) {
      editor.current.addAction({
        id: 'execute',
        label: 'Execute',
        keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
        run: () => handleExecute(s.kernel),
      });
    }
  }, [s.kernel, editor.current]);

  const handleExecute = (kernel: string) => {
    let code = editor.current?.getValue();
    if (!kernel) {
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
    if (code) {
      if (code.slice(0, 6) === '%%info') {
        code = `roomId = '${roomId}'\nboardId = '${boardId}'\nkernelId = '${kernel}'`;
      }
      updateState(props.app._id, {
        code: code,
        output: '',
        executeInfo: { executeFunc: 'execute', params: { _uuid: getUUID() } },
      });
    }
  };

  const handleClear = () => {
    updateState(props.app._id, {
      code: '',
      output: '',
      executeInfo: { executeFunc: '', params: {} },
    });
    editor.current?.setValue('');
  };

  // Handle interrupt
  const handleInterrupt = () => {
    if (!user) return;
    updateState(props.app._id, {
      executeInfo: { executeFunc: 'interrupt', params: {} },
    });
  };

  useEffect(() => {
    // update local state from global state
    setFontSize(s.fontSize);
  }, [s.fontSize]);

  // Get the reference to the Monaco Editor after it mounts
  function handleEditorDidMount(ed: Monaco) {
    editor.current = ed;
  }

  useEffect(() => {
    if (s.kernel !== kernel) {
      setKernel(s.kernel);
    }
  }, [s.kernel]);

  const options = {
    fontSize: fontSize,
    minimap: { enabled: false },
    lineNumbers: 'on',
    automaticLayout: true,
    quickSuggestions: false,
    glyphMargin: false,
    folding: false,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    readOnlyMessage: 'You do not have access to this kernel',
    readOnly: !access,
    renderLineHighlight: 'all', // 'none' | 'gutter' | 'line' | 'all'
    scrollbar: {
      vertical: 'auto', // 'scroll' | 'hidden' | 'visible' | 'auto'
      horizontal: 'scroll',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
  };

  return (
    <>
      <HStack mr={2}>
        <Editor
          value={code}
          defaultLanguage="python"
          width={'100%'}
          height={'150px'}
          language={'python'}
          theme={colorMode === 'light' ? 'vs-light' : 'vs-dark'}
          options={options}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
        />
        <ButtonGroup isAttached variant="outline" size="lg" orientation="vertical" p={1}>
          <Tooltip hasArrow label="Execute" placement="right-start">
            <IconButton
              onClick={() => handleExecute(s.kernel)}
              aria-label={''}
              icon={
                s.executeInfo?.executeFunc === 'execute' ? (
                  <Spinner size="sm" color="teal.500" />
                ) : (
                  <MdPlayArrow size={'1.5em'} color="#008080" />
                )
              }
              isDisabled={!s.kernel}
            />
          </Tooltip>
          <Tooltip hasArrow label="Stop" placement="right-start">
            <IconButton
              onClick={handleInterrupt}
              aria-label={''}
              isDisabled={!s.kernel || s.executeInfo?.executeFunc !== 'execute'}
              icon={<MdStop size={'1.5em'} color="#008080" />}
            />
          </Tooltip>
          <Tooltip hasArrow label="Clear All" placement="right-start">
            <IconButton onClick={handleClear} aria-label={''} isDisabled={!s.kernel} icon={<MdClearAll size={'1.5em'} color="#008080" />} />
          </Tooltip>
        </ButtonGroup>
      </HStack>
    </>
  );
};

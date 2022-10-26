/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useRef, useEffect, useState } from 'react';

import { HStack, useColorModeValue, Tooltip, IconButton, VStack, Flex } from '@chakra-ui/react';

// import './components/styles.css';
// // Date manipulation (for filename)
// import dateFormat from 'date-fns/format';
// UUID generation
import { v4 as getUUID } from 'uuid';

import { MdDelete, MdPlayArrow } from 'react-icons/md';

import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/keybinding-vscode';

// SAGE3 imports
import { useAppStore, useUser } from '@sage3/frontend';
import { state as AppState } from '../index';
// import { AppWindow } from '../../components';
import { App } from '../../../schema';
import React from 'react';

// Utility functions from SAGE3
// import { downloadFile } from '@sage3/frontend';
/**
 *
 * @param props
 * @returns
 */
export const InputBox = (props: App): JSX.Element => {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const ace = useRef<AceEditor>(null);
  const [code, setCode] = useState<string>(s.code);
  const { user } = useUser();
  const [fontSize, setFontSize] = useState(s.fontSize);

  const handleExecute = () => {
    const code = ace.current?.editor?.getValue();
    if (code) {
      updateState(props._id, {
        code: code,
        output: '',
        executeInfo: { executeFunc: 'execute', params: { uuid: getUUID() } },
      });
    }
  };

  const handleClear = () => {
    updateState(props._id, {
      code: '',
      output: '',
      executeInfo: { executeFunc: '', params: {} },
    });
    ace.current?.editor?.setValue('');
  };

  useEffect(() => {
    if (s.code !== code) {
      setCode(s.code);
    }
  }, [s.code]);

  // Update from Ace Editor
  const updateCode = (c: string) => {
    setCode(c);
  };

  useEffect(() => {
    // update local state from global state
    setFontSize(s.fontSize);
  }, [s.fontSize]);

  return (
    <>
      <HStack>
        <AceEditor
          ref={ace}
          name="ace"
          value={code}
          onChange={updateCode}
          readOnly={user?._id !== props._createdBy}
          fontSize={`${fontSize}px`}
          minLines={4}
          maxLines={20}
          placeholder="Enter code here"
          mode={s.language}
          theme={useColorModeValue('xcode', 'tomorrow_night_bright')}
          editorProps={{ $blockScrolling: true }}
          setOptions={{
            hasCssTransforms: true,
            showGutter: true,
            showPrintMargin: false,
            highlightActiveLine: true,
            showLineNumbers: true,
          }}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            marginTop: 15,
            marginLeft: 15,
            marginRight: 0,
            marginBottom: 10,
            padding: 0,
            overflow: 'hidden',
            backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
            boxShadow: '0 0 0 2px ' + useColorModeValue('rgba(0,0,0,0.4)', 'rgba(0, 128, 128, 0.5)'),
            borderRadius: '4px',
          }}
          commands={[
            { name: 'Execute', bindKey: { win: 'Shift-Enter', mac: 'Shift-Enter' }, exec: handleExecute },
            { name: 'Clear', bindKey: { win: 'Ctrl-Alt-Backspace', mac: 'Ctrl-Alt-Backspace' }, exec: handleClear },
          ]}
        />
        <VStack pr={2}>
          <Tooltip hasArrow label="Execute" placement="right-start">
            <IconButton
              _hover={{ bg: 'invisible', transform: 'scale(1.2)', transition: 'transform 0.2s' }}
              boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.6)'}
              size={'xs'}
              rounded={'full'}
              onClick={handleExecute}
              aria-label={''}
              disabled={user?._id !== props._createdBy}
              bg={useColorModeValue('#FFFFFF', '#000000')}
              variant="outline"
              icon={<MdPlayArrow size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
            />
          </Tooltip>
          <Tooltip hasArrow label="Clear All" placement="right-start">
            <IconButton
              _hover={{ bg: 'invisible', transform: 'scale(1.2)', transition: 'transform 0.2s' }}
              boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.4)'}
              size={'xs'}
              rounded={'full'}
              onClick={handleClear}
              aria-label={''}
              disabled={user?._id !== props._createdBy}
              bg={useColorModeValue('#FFFFFF', '#000000')}
              variant="outline"
              icon={<MdDelete size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
            />
          </Tooltip>
        </VStack>
      </HStack>
      {/* <Flex pr={10} h={'24px'} fontSize={'16px'} color={'GrayText'} justifyContent={'right'}>
        Ln: {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().row + 1 : 1}, Col:{' '}
        {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().column + 1 : 1}
      </Flex> */}
    </>
  );
};

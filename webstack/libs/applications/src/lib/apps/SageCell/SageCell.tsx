/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useRef, useEffect, useState } from 'react';
import {
  Box,
  Button,
  HStack,
  useColorModeValue,
  Tooltip,
  ButtonGroup,
  Select,
  Badge,
  Text,
  Image,
  Alert,
  AlertIcon,
  IconButton,
  VStack,
  Flex,
  Stack,
} from '@chakra-ui/react';

import { v4 as getUUID } from 'uuid';

import { MdDelete, MdPlayArrow } from 'react-icons/md';

import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/keybinding-vscode';

import Ansi from 'ansi-to-react';

import './components/styles.css';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';
import { MdFileDownload, MdAdd, MdRemove, MdArrowDropDown } from 'react-icons/md';

// SAGE3 imports
import { useAppStore, useUser } from '@sage3/frontend';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';

// Utility functions from SAGE3
import { downloadFile } from '@sage3/frontend';
import { useLocation } from 'react-router-dom';


// Rendering functions
// import { ProcessedOutput } from './render';
// import { InputBox } from './components/InputBox';
// import { OutputBox } from './components/OutputBox';

/**
 * SageCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
const AppComponent = (props: App): JSX.Element => {

  const [output, setOutput] = useState({} as any);

  const s = props.data.state as AppState;

  useEffect(() => {
    if (s.output) {
      try {
        const parsed = JSON.parse(s.output);
        if (parsed) {
          // console.log(parsed);
          setOutput(parsed);
        }
      } catch (e) {
        console.log(e);
      }
    } else {
      setOutput({});
    }
  }, [s.output]);

  return (
    <AppWindow app={props}>
      <Box w={'100%'} h={'100%'} bg={useColorModeValue('#E8E8E8', '#1A1A1A')} fontSize={`${s.fontSize}rem`}>
        <Stack w={'100%'} h={'100%'} spacing={0}>
          {InputBox(props)}
          {!s.output ? null : !output ? `No output to display` : OutputBox(output)}
        </Stack>
      </Box>
    </AppWindow>
  );
}

/**
 * UI toolbar for the SageCell application
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
function ToolbarComponent(props: App): JSX.Element {
  // Access the global app state
  const s = props.data.state as AppState;
  const { user } = useUser();
  const location = useLocation();
  const locationState = location.state as { boardId: string; roomId: string };

  // Update functions from the store
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const [selected, setSelected] = useState<string>('');
  const [availableKernels, setAvailableKernels] = useState(s.availableKernels);

  // const [kernels, setKernels] = useState<string[]>([]);

  /**
   * Get the list of available kernels from the server when the app is loaded
   */
  useEffect(() => {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'get_available_kernels',
        params: { room_uuid: locationState.roomId, board_uuid: locationState.boardId, user_uuid: user._id },
      },
    });
  }, []);

  useEffect(() => {
    if (s.availableKernels) {
      setAvailableKernels(s.availableKernels);
    }
  }, [s.availableKernels]);

  const getAvailableKernels = () => {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'get_available_kernels',
        params: { room_uuid: locationState.roomId, board_uuid: locationState.boardId, user_uuid: user._id },
      },
    });
    if (s.availableKernels) {
      setAvailableKernels(s.availableKernels);
      updateState(props._id, { availableKernels: []});
    }
  }

  useEffect(() => {
    setSelected(s.kernel);
  }, [s.kernel]);

  // useEffect(() => {
  //   setOutput(s.output);
  // }, [s.output]);

  function selectKernel(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value) {
      // save local state
      setSelected(e.target.value);
      // updae the app
      updateState(props._id, { kernel: e.target.value });
      // update the app description with the kernel alias
      update(props._id, { description: e.currentTarget.selectedOptions[0].text });
      // update(props._id, { description: `SageCell> ${e.target}` });
    }
  }

  // Download the stickie as a text file
  const downloadPy = () => {
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    const content = `${s.code}`;
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with username and date
    const filename = 'sagecell-' + dt + '.py';
    // Go for download
    downloadFile(txturl, filename);
  };


  return (
    <>
      <HStack>
        {/* check if the object is empty */}
        {!selected ? (
          // show a red light if the kernel is not running
          <Badge colorScheme="red" rounded="sm" size="lg">
            Offline
          </Badge>
        ) : (
          // show a green light if the kernel is running
          <Badge colorScheme="green" rounded="sm" size="lg">
            Online
          </Badge>
        )}
        <Select
          placeholder="Select Kernel"
          rounded="lg"
          size="sm"
          width="150px"
          ml={2}
          px={0}
          colorScheme="teal"
          icon={<MdArrowDropDown />}
          onFocus={getAvailableKernels}
          onChange={selectKernel}
          value={selected ?? undefined}
          variant={'outline'}
        >
          {/* {s.availableKernels.map(({ value, label }) => <option value={value} >{label}</option>)} */}
          {availableKernels.map(({ id, alias }) => <option value={id} >{alias}</option>)}
        </Select>

        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
            <Button
              isDisabled={s.fontSize < 1}
              onClick={() => updateState(props._id, { fontSize: Math.max(1, s.fontSize / 1.2) })}
              _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
            >
              <MdRemove />
            </Button>
          </Tooltip>
          <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
            <Button
              isDisabled={s.fontSize >= 3}
              onClick={() => updateState(props._id, { fontSize: Math.min(s.fontSize * 1.2, 3) })}
              _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
            >
              <MdAdd />
            </Button>
          </Tooltip>
        </ButtonGroup>
        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="top-start" hasArrow={true} label={'Download Code'} openDelay={400}>
            <Button onClick={downloadPy} _hover={{ opacity: 0.7 }}>
              <MdFileDownload />
            </Button>
          </Tooltip>
        </ButtonGroup>
      </HStack>
    </>
  );
}

export default { AppComponent, ToolbarComponent };



/**
 *
 * @param output
 * @returns {JSX.Element}
 */
const OutputBox = (output: any): JSX.Element => {

      return (
        <Box
          // id="sc-output"
          w={'100%'}
          h={'100%'}
          p={2}
          bg={useColorModeValue('#E8E8E8', '#1A1A1A')}
          borderTop={'2px solid #ccc'}
          overflowY={'scroll'}
          css={{
            scrollbarColor: 'teal  #f1f1f1',
            '&::-webkit-scrollbar': {
              width: '6px',
              height: '6px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'teal',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'teal',
              borderRadius: '24px',
            },
            '&::-webkit-scrollbar-corner': {
              backgroundColor: 'teal',
            },
          }}
        >
          <HStack w={'100%'} h={'100%'} spacing={2} pt={0} pb={0}>
            {/* <VStack w={'24px'} h={'24px'} spacing={2} pt={0} pb={0}> */}
            <Text w={'24px'} h={'98%'} fontSize={'10px'} style={{ fontFamily: 'monospace', fontWeight: 'bold' }} fontWeight={'bold'}>
              {!output.execute_result ? `[ ]` : `[${output.execute_result.execution_count}]`}
            </Text>
            {/* </VStack> */}
            <VStack w={'100%'} h={'100%'} spacing={2} pt={0} pb={0}>
              <Alert
                status={!output.error ? 'success' : 'error'}
                variant={'left-accent'}
                style={{ backgroundColor: useColorModeValue('#FFF', '#111') }}
              >
                <Box w={'100%'} h={'100%'}>
                  {output.request_id ? null : null}
                  {!output.error ? null : !Array.isArray(output.error) ? (
                    <Alert status="error">{`${output.error.ename}: ${output.error.evalue}`}</Alert>
                  ) : (
                    <>
                      <AlertIcon />
                      <Ansi>{output.error[output.error.length - 1]}</Ansi>
                    </>
                  )}
                  {!output.stream ? null : output.stream.name === 'stdout' ? (
                    <Text id="sc-stdout">{output.stream.text}</Text>
                  ) : (
                    <Text id="sc-stderr" color="red">
                      {output.stream.text}
                    </Text>
                  )}
                  {!output.display_data
                    ? null
                    : Object.keys(output.display_data.data).map((key, i) => {
                        switch (key) {
                          case 'text/plain':
                            return (
                              <Text key={i} id="sc-stdout">
                                {output.display_data.data[key]}
                              </Text>
                            );
                          case 'text/html':
                            return <div key={i} dangerouslySetInnerHTML={{ __html: output.display_data.data[key] }} />;
                          case 'image/png':
                            return <Image key={i} src={`data:image/png;base64,${output.display_data.data[key]}`} />;
                          case 'image/jpeg':
                            return <Image key={i} src={`data:image/jpeg;base64,${output.display_data.data[key]}`} />;
                          case 'image/svg+xml':
                            return <div key={i} dangerouslySetInnerHTML={{ __html: output.display_data.data[key] }} />;
                          case 'application/javascript':
                            return <Text>javascript not handled</Text>;
                          case 'text/latex':
                            return <Text>latex not handled</Text>;
                          default:
                            return <></>;
                        }
                      })}

                  {!output.execute_result
                    ? null
                    : Object.keys(output.execute_result.data).map((key, i) => {
                        switch (key) {
                          case 'text/plain':
                            if (output.execute_result.data['text/html']) return null; // don't show plain text if there is html
                            // return(output.execute_result.data[key])
                            return <Text key={i}>{output.execute_result.data[key]}</Text>;
                          case 'text/html':
                            return <div key={i} dangerouslySetInnerHTML={{ __html: output.execute_result.data[key] }} />;
                          case 'image/png':
                            return <Image key={i} src={`data:image/png;base64,${output.execute_result.data[key]}`} />;
                          case 'image/jpeg':
                            return <Image key={i} src={`data:image/jpeg;base64,${output.execute_result.data[key]}`} />;
                          case 'image/svg+xml':
                            return <div key={i} dangerouslySetInnerHTML={{ __html: output.execute_result.data[key] }} />;
                          case 'application/javascript':
                            return <Text>javascript not handled</Text>;
                          case 'text/latex':
                            return <Text>latex not handled</Text>;
                          default:
                            return <></>;
                        }
                      })}
                </Box>
              </Alert>
            </VStack>
          </HStack>
        </Box>
      );
    };
    





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
      <Stack>
          <HStack w={'100%'} h={'100%'} spacing={2} pt={2} pb={2}>
          <VStack spacing={2} pl={2} pr={0}>
            <Tooltip hasArrow label="Execute" placement="right-start">
              <IconButton
                _hover={{ bg: 'invisible', transform: 'scale(1.2)', transition: 'transform 0.2s' }}
                boxShadow={'2px 4px 8px rgba(0, 0, 0, 0.6)'}
                size={'xs'}
                rounded={'full'}
                colorScheme={'teal'}
                aria-label="Execute"
                onClick={handleExecute}
                // disabled={user?._id !== props._createdBy}
                variant="outline"
                icon={
                  <MdPlayArrow
                    size={'18px'}
                  />
                }
              />
            </Tooltip>
            <Tooltip hasArrow label="Clear All" placement="right-start">
              <IconButton
                _hover={{ bg: 'invisible', transform: 'scale(1.2)', transition: 'transform 0.2s' }}
                boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.4)'}
                size={'xs'}
                rounded={'full'}
                colorScheme={'teal'}
                aria-label="Clear All"
                onClick={handleClear}
                // disabled={user?._id !== props._createdBy}
                variant="outline"
                icon={
                  <MdDelete
                    size={'18px'}
                  />
                }
              />
            </Tooltip>
          </VStack>
            <AceEditor
              ref={ace}
              name="ace"
              value={code}
              onChange={updateCode}
              // readOnly={user?._id !== props._createdBy}
              fontSize={`${fontSize}rem`}
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
                overflow: 'auto',
                backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
                boxShadow: '0 0 0 2px ' + useColorModeValue('rgba(0,0,0,0.4)', 'rgba(0, 128, 128, 0.5)'),
                borderRadius: '4px',
              }}
              commands={[
                { name: 'Execute', bindKey: { win: 'Shift-Enter', mac: 'Shift-Enter' }, exec: handleExecute },
                { name: 'Clear', bindKey: { win: 'Ctrl-Alt-Backspace', mac: 'Ctrl-Alt-Backspace' }, exec: handleClear },
              ]}
            />
            <Box p={0} />
            </HStack>
            <Flex pr={2} fontSize={'16px'} color={'GrayText'} justifyContent={'right'}>
              Ln: {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().row + 1 : 1}, Col:{' '}
              {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().column + 1 : 1}
            </Flex>
        {/* </HStack> */}
      </Stack>
  );
};
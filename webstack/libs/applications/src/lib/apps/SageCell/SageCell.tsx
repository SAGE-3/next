/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useRef, useState } from 'react';
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
  Toast,
  useToast,
  IconButton,
  VStack,
} from '@chakra-ui/react';

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
import { MdFileDownload, MdAdd, MdRemove, MdArrowDropDown, MdError, MdDelete, MdPlayArrow } from 'react-icons/md';

// SAGE3 imports
import { useAppStore, useUser } from '@sage3/frontend';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';

// Utility functions from SAGE3
import { downloadFile } from '@sage3/frontend';

// UUID generation
import { v4 as getUUID } from 'uuid';

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
  const { user } = useUser();
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

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
    }
  }, [s.output]);

  return (
    <AppWindow app={props}>
      <Box id="sc-container" w={'100%'} h={'100%'} bg={useColorModeValue('#E8E8E8', '#1A1A1A')} overflowY={'scroll'}>
        {InputBox(props)}
        {!output ? null : (
          <>
            <Box
              p={4}
              m={4}
              className="sc-output"
              style={{
                height: '100%',
                overflowX: 'auto',
                backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
                boxShadow: '0 0 0 2px ' + useColorModeValue('rgba(0,0,0,0.4)', 'rgba(0, 128, 128, 0.5)'),
                borderRadius: '4px',
                fontFamily: 'monospace',
                // fontSize: `${s.fontSize}rem`,
                fontSize: s.fontSize + 'px',
                color: useColorModeValue('#000000', '#FFFFFF'),
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {/* {OutputBox(output)} */}
              {!s.output ? null : !output ? `No output to display` : OutputBox(output)}

              {!s.privateMessage
                ? null
                : s.privateMessage.map(({ userId, message }) => {
                    // find the user name that matches the userId
                    if (userId !== user!._id) {
                      return null;
                    }
                    return (
                      <Toast
                        status="error"
                        description={message + ', ' + user!.data.name}
                        duration={5000}
                        isClosable
                        onClose={() => updateState(props._id, { privateMessage: [] })}
                        hidden={userId !== user!._id}
                      />
                    );
                  })}
            </Box>
          </>
        )}
      </Box>
    </AppWindow>
  );
};

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

  // Update functions from the store
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'get_available_kernels',
        params: { user_uuid: user._id },
      },
    });
  }, [user]);

  // Update from the props
  useEffect(() => {
    s.kernel ? setSelected(s.kernel) : setSelected('Select kernel');
  }, [s.kernel]);

  function selectKernel(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value) {
      // save local state
      setSelected(e.target.value);
      // updae the app
      updateState(props._id, { kernel: e.target.value });
      // update the app description
      update(props._id, { description: `SageCell> ${e.currentTarget.selectedOptions[0].text}` });
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

  const [fontSize, setFontSize] = useState(s.fontSize);

  useEffect(() => {
    updateState(props._id, { fontSize: fontSize });
  }, [fontSize]);

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
          onChange={selectKernel}
          value={selected ?? undefined}
          variant={'outline'}
        >
          {s.availableKernels.map(({ value, label }) => (
            <option value={value}>{label}</option>
          ))}
        </Select>

        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
            <Button
              isDisabled={s.fontSize <= 8}
              onClick={() => updateState(props._id, { fontSize: Math.max(24, s.fontSize - 2) })}
              _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
            >
              <MdRemove />
            </Button>
          </Tooltip>
          <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
            <Button
              isDisabled={s.fontSize > 42}
              onClick={() => updateState(props._id, { fontSize: Math.min(48, s.fontSize + 2) })}
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

        <ButtonGroup isAttached size="xs" colorScheme="teal">
          <Tooltip placement="top-start" hasArrow={true} label={'Generate Error'} openDelay={400}>
            <Button
              onClick={() =>
                updateState(props._id, {
                  executeInfo: {
                    executeFunc: 'generate_error_message',
                    params: { user_uuid: user!._id },
                  },
                })
              }
              _hover={{ opacity: 0.7 }}
            >
              <MdError />
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

/**
 *
 * @param output
 * @returns {JSX.Element}
 */
const OutputBox = (output: any): JSX.Element => {
  return (
    <>
      {/**
       * TODO: Fix the display of the execution count
       */}
      {!output.execute_result ? null : (
        <Text
          fontSize="xs"
          color="gray.500"
          style={{
            fontFamily: 'monospace',
          }}
        >
          {`Out [${output.execute_result.execution_count}]`}
        </Text>
      )}
      {output.request_id ? null : null}
      {!output.error ? null : !Array.isArray(output.error) ? (
        <Alert status="error">{`${output.error.ename}: ${output.error.evalue}`}</Alert>
      ) : (
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          <Ansi>{output.error[output.error.length - 1]}</Ansi>
        </Alert>
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
                return null;
            }
          })}

      {!output.execute_result
        ? null
        : Object.keys(output.execute_result.data).map((key, i) => {
            switch (key) {
              case 'text/plain':
                if (output.execute_result.data['text/html']) return null; // don't show plain text if there is html
                return (
                  <Text key={i} id="sc-stdout">
                    {output.execute_result.data[key]}
                  </Text>
                );
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
                return null;
            }
          })}
    </>
  );
};

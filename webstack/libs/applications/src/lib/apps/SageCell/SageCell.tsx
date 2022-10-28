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
  IconButton,
  VStack,
  Flex,
  Stack,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
} from '@chakra-ui/react';

import { MdFileDownload, MdAdd, MdRemove, MdArrowDropDown, MdError, MdPlayArrow, MdClearAll } from 'react-icons/md';

import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';
import 'ace-builds/src-noconflict/theme-xcode';
import 'ace-builds/src-noconflict/keybinding-vscode';

// UUID generation
import { v4 as getUUID } from 'uuid';

// Needed to help render the trace
import Ansi from 'ansi-to-react';

// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

// SAGE3 imports
import { useAppStore, useHexColor, useUser, downloadFile } from '@sage3/frontend';
import { User } from '@sage3/shared/types';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';

const MARGIN = 2;

/**
 * SageCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
const AppComponent = (props: App): JSX.Element => {
  const { user } = useUser();
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [myKernels, setMyKernels] = useState(s.availableKernels);
  const [access, setAccess] = useState(true);

  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A');
  const accessDeniedColor = useColorModeValue('#EFDEDD', '#DDD1D1');

  useEffect(() => {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'get_available_kernels',
        params: { user_uuid: user._id },
      },
    });
  }, [user]);

  useEffect(() => {
    // Get all kernels that I'm available to see
    const kernels: any[] = [];
    s.availableKernels.forEach((kernel) => {
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

  useEffect(() => {
    if (s.kernel == '') {
      setAccess(true);
    } else {
      const access = myKernels.find((kernel) => kernel.key == s.kernel);
      setAccess(access ? true : false);
    }
  }, [s.kernel, myKernels]);

  return (
    <AppWindow app={props}>
      <Box
        id="sc-container"
        w={'100%'}
        h={'100%'}
        bg={access ? bgColor : accessDeniedColor}
        overflowY={'scroll'}
        css={{
          '&::-webkit-scrollbar': {
            width: '.1em',
          },
          '&::-webkit-scrollbar-track': {
            '-webkit-box-shadow': 'inset 0 0 6px rgba(0,0,0,0.00)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'teal',
            outline: '2px solid teal',
          },
        }}
        pointerEvents={access ? 'auto' : 'none'}
      >
        <InputBox app={props} access={access} />
        {!s.output ? null : <OutputBox output={s.output} app={props} user={user!} />}
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
  const [myKernels, setMyKernels] = useState(s.availableKernels);
  const [access, setAccess] = useState(true);

  useEffect(() => {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'get_available_kernels',
        params: { user_uuid: user._id },
      },
    });
  }, [user]);

  useEffect(() => {
    // Get all kernels that I'm available to see
    const kernels: any[] = [];
    s.availableKernels.forEach((kernel) => {
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

  useEffect(() => {
    if (s.kernel == '') {
      setAccess(true);
    } else {
      const access = myKernels.find((kernel) => kernel.key == s.kernel);
      setAccess(access ? true : false);
    }
  }, [s.kernel, myKernels]);

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
      update(props._id, { title: `SageCell> ${e.currentTarget.selectedOptions[0].text}` });
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
        {access ? (
          <>
            {/* check if there are any available kernels and if one is selected */}
            {!myKernels || !s.kernel ? (
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
              {myKernels.map((kernel) => (
                <option value={kernel.key} key={kernel.key}>
                  {kernel.value.kernel_alias} (
                  {
                    // show kernel name as Python, R, or Julia
                    kernel.value.kernel_name === 'python3' ? 'Python' : kernel.value.kernel_name === 'r' ? 'R' : 'Julia'
                  }
                  )
                </option>
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
          </>
        ) : (
          <>This CodeCell is Private</>
        )}
      </HStack>
    </>
  );
}

export default { AppComponent, ToolbarComponent };

type InputBoxProps = {
  app: App;
  access: boolean; //Does this user have access to the sagecell's selected kernel
};

/**
 *
 * @param props
 * @returns
 */
const InputBox = (props: InputBoxProps): JSX.Element => {
  const s = props.app.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const ace = useRef<AceEditor>(null);
  const [code, setCode] = useState<string>(s.code);
  const { user } = useUser();
  const [fontSize, setFontSize] = useState(s.fontSize);

  const handleExecute = () => {
    const code = ace.current?.editor?.getValue();
    if (code) {
      updateState(props.app._id, {
        code: code,
        output: '',
        executeInfo: { executeFunc: 'execute', params: { uuid: getUUID() } },
      });
    }
  };

  const handleClear = () => {
    updateState(props.app._id, {
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
    <Box>
      <HStack>
        <AceEditor
          ref={ace}
          name="ace"
          value={code}
          onChange={updateCode}
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
            marginTop: '0.5rem',
            marginLeft: '0.5rem',
            marginRight: '0rem',
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
          {props.access ? (
            <Tooltip hasArrow label="Execute" placement="right-start">
              <IconButton
                boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.6)'}
                onClick={handleExecute}
                aria-label={''}
                bg={useColorModeValue('#FFFFFF', '#000000')}
                variant="ghost"
                icon={<MdPlayArrow size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
              />
            </Tooltip>
          ) : null}

          {props.access ? (
            <Tooltip hasArrow label="Clear All" placement="right-start">
              <IconButton
                boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.6)'}
                onClick={handleClear}
                aria-label={''}
                disabled={user?._id !== s.kernel ? false : true}
                bg={useColorModeValue('#FFFFFF', '#000000')}
                variant="ghost"
                icon={<MdClearAll size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
              />
            </Tooltip>
          ) : null}
        </VStack>
      </HStack>
      <Stack px={4}>
        <HStack>
          <Text fontSize="sm" color={useColorModeValue('#000000', '#FFFFFF')}></Text>
          <Slider
            aria-label="slider-ex-4"
            defaultValue={fontSize}
            min={24}
            max={48}
            step={1}
            onChange={(value) => {
              setFontSize(value);
            }}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </HStack>
        <Text fontSize="xs" color={useColorModeValue('#000000', '#FFFFFF')}>
          {s.executeInfo?.executeFunc === 'execute' ? (
            'Executing...'
          ) : (
            <Flex pr={MARGIN} h={'24px'} fontSize={'16px'} color={'GrayText'} justifyContent={'right'}>
              Ln: {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().row + 1 : 1}, Col:{' '}
              {ace.current?.editor.getCursorPosition() ? ace.current?.editor.getCursorPosition().column + 1 : 1}
            </Flex>
          )}
        </Text>
      </Stack>
    </Box>
  );
};

type OutputBoxProps = {
  output: string;
  app: App;
  user: User;
};
/**
 * This function is used to render the output box
 * The output is a string from a python script that
 * is executed in the kernel, serialized using JSON.dumps(),
 * and then sent back to the client.
 * The output is then parsed using JSON.parse() and displayed
 * in the output box.
 *
 * @param props OutputBoxProps
 * @returns {JSX.Element}
 */
const OutputBox = (props: OutputBoxProps): JSX.Element => {
  const parsedJSON = JSON.parse(props.output);
  const s = props.app.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  if (!props.output) return <></>;
  if (typeof props.output === 'object' && Object.keys(props.output).length === 0) return <></>;
  return (
    <Box
      p={MARGIN}
      m={MARGIN}
      hidden={!parsedJSON ? true : false}
      className="sc-output"
      style={{
        overflow: 'auto',
        backgroundColor: useColorModeValue('#F0F2F6', '#111111'),
        boxShadow: '0 0 0 2px ' + useColorModeValue('rgba(0,0,0,0.4)', 'rgba(0, 128, 128, 0.5)'),
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: s.fontSize + 'px',
        color: useColorModeValue('#000000', '#FFFFFF'),
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
      }}
    >
      {!parsedJSON.execute_result || !parsedJSON.execute_result.execution_count ? null : (
        <Text
          fontSize="xs"
          color="gray.500"
          style={{
            fontFamily: 'monospace',
          }}
        >
          {`Out [${parsedJSON.execute_result.execution_count}]`}
        </Text>
      )}
      {parsedJSON.request_id ? null : null}
      {!parsedJSON.error ? null : !Array.isArray(parsedJSON.error) ? (
        <Alert status="error">{`${parsedJSON.error.ename}: ${parsedJSON.error.evalue}`}</Alert>
      ) : (
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          <Ansi>{parsedJSON.error[parsedJSON.error.length - 1]}</Ansi>
        </Alert>
      )}

      {!parsedJSON.stream ? null : parsedJSON.stream.name === 'stdout' ? (
        <Text id="sc-stdout">{parsedJSON.stream.text}</Text>
      ) : (
        <Text id="sc-stderr" color="red">
          {parsedJSON.stream.text}
        </Text>
      )}

      {!parsedJSON.display_data
        ? null
        : Object.keys(parsedJSON.display_data).map((key) => {
            if (key === 'data') {
              return Object.keys(parsedJSON.display_data.data).map((key, i) => {
                switch (key) {
                  case 'text/plain':
                    return (
                      <Text key={i} id="sc-stdout">
                        {parsedJSON.display_data.data[key]}
                      </Text>
                    );
                  case 'text/html':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.display_data.data[key] }} />;
                  case 'image/png':
                    return <Image key={i} src={`data:image/png;base64,${parsedJSON.display_data.data[key]}`} />;
                  case 'image/jpeg':
                    return <Image key={i} src={`data:image/jpeg;base64,${parsedJSON.display_data.data[key]}`} />;
                  case 'image/svg+xml':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.display_data.data[key] }} />;
                  default:
                    return MapJSONObject(parsedJSON.display_data[key]);
                }
              });
            }
            return null;
          })}

      {!parsedJSON.execute_result
        ? null
        : Object.keys(parsedJSON.execute_result).map((key) => {
            if (key === 'data') {
              return Object.keys(parsedJSON.execute_result.data).map((key, i) => {
                switch (key) {
                  case 'text/plain':
                    if (parsedJSON.execute_result.data['text/html']) return null; // don't show plain text if there is html
                    return (
                      <Text key={i} id="sc-stdout">
                        {parsedJSON.execute_result.data[key]}
                      </Text>
                    );
                  case 'text/html':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.execute_result.data[key] }} />;
                  case 'image/png':
                    return <Image key={i} src={`data:image/png;base64,${parsedJSON.execute_result.data[key]}`} />;
                  case 'image/jpeg':
                    return <Image key={i} src={`data:image/jpeg;base64,${parsedJSON.execute_result.data[key]}`} />;
                  case 'image/svg+xml':
                    return <div key={i} dangerouslySetInnerHTML={{ __html: parsedJSON.execute_result.data[key] }} />;
                  default:
                    return null;
                }
              });
            }
            return null;
          })}
      {!s.privateMessage
        ? null
        : s.privateMessage.map(({ userId, message }) => {
            // find the user name that matches the userId
            if (userId !== props.user._id) {
              return null;
            }
            return (
              <Toast
                status="error"
                description={message + ', ' + props.user.data.name}
                duration={5000}
                isClosable
                onClose={() => updateState(props.app._id, { privateMessage: [] })}
                hidden={userId !== props.user._id}
              />
            );
          })}
    </Box>
  );
};

/**
 * Recursively map the object and display the output
 * This is used to display the output similar to JSON
 * when the output is an unhandled type
 * @param {Object} obj
 */
const MapJSONObject = (obj: any): JSX.Element => {
  if (!obj) return <></>;
  if (typeof obj === 'object' && Object.keys(obj).length === 0) return <></>;
  return (
    <Box
      pl={2}
      ml={2}
      bg={useColorModeValue('#FFFFFF', '#000000')}
      boxShadow={'2px 2px 4px rgba(0, 0, 0, 0.6)'}
      rounded={'md'}
      fontSize={'16px'}
      color={useColorModeValue('#000000', '#FFFFFF')}
    >
      {typeof obj === 'object'
        ? Object.keys(obj).map((key) => {
            if (typeof obj[key] === 'object') {
              return (
                <Box key={key}>
                  <Box as="span" fontWeight="bold">
                    {key}:
                  </Box>
                  <Box as="span" ml={2}>
                    {MapJSONObject(obj[key])}
                  </Box>
                </Box>
              );
            } else {
              return (
                <Box key={key}>
                  <Box as="span" fontWeight="bold">
                    {key}:
                  </Box>
                  <Box as="span" ml={2}>
                    {obj[key]}
                  </Box>
                </Box>
              );
            }
          })
        : null}
    </Box>
  );
};

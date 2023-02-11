/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { downloadFile, useAppStore, useUser } from '@sage3/frontend';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Divider,
  HStack,
  IconButton,
  Image,
  Select,
  Spinner,
  Stack,
  Text,
  Textarea,
  Tooltip,
  useColorMode,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { MdAdd, MdArrowDropDown, MdClearAll, MdFileDownload, MdPlayArrow, MdRefresh, MdRemove, MdStop } from 'react-icons/md';
import { useEffect, useRef, useState } from 'react';

// import AceEditor from "react-ace";
import { v4 as getUUID } from 'uuid';
import Ansi from 'ansi-to-react';

// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

import Editor, { DiffEditor, loader, Monaco, useMonaco } from '@monaco-editor/react';

/* App component for Seer */

function AppComponent(props: App): JSX.Element {
  // Make a toast to show errors
  const toast = useToast();
  const { user } = useUser();
  const s = props.data.state as AppState;
  const [myKernels, setMyKernels] = useState(s.kernels);

  const [access, setAccess] = useState<boolean>(true);
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const [prompt, setPrompt] = useState<string>(s.prompt);
  // const BACKGROUND = useColorModeValue('#F0F2F6', '#111111');

  // Set the initial size of the window
  useEffect(() => {
    update(props._id, {
      size: {
        width: 995,
        height: 555,
        depth: 1,
      },
    });
  }, []);

  const updatePrompt = (e: any) => {
    updateState(props._id, {
      prompt: e.target.value,
    });
  };

  useEffect(() => {
    setPrompt(s.prompt);
  }, [s.prompt]);

  useEffect(() => {
    // Get all kernels that I'm available to see
    const kernels: any[] = [];
    s.kernels.forEach((kernel) => {
      if (kernel.value.is_private) {
        if (kernel.value.owner_uuid == user?._id) {
          kernels.push(kernel);
        }
      } else {
        kernels.push(kernel);
      }
    });
    setMyKernels(kernels);
  }, [JSON.stringify(s.kernels)]);

  useEffect(() => {
    if (s.kernel == '') {
      setAccess(true);
    } else {
      const access = myKernels.find((kernel) => kernel.key === s.kernel);
      setAccess(access ? true : false);
    }
  }, [s.kernel, myKernels]);

  const handleGenerate = (kernel: string) => {
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
    if (prompt) {
      updateState(props._id, {
        prompt: prompt,
        output: '',
        executeInfo: { executeFunc: 'generate', params: { _uuid: getUUID() } },
      });
    }
  };
  // handle interrupt
  const handleInterrupt = () => {
    if (!user) return;
    updateState(props._id, {
      executeInfo: { executeFunc: 'interrupt', params: { user_uuid: user._id } },
    });
  };
  const handleClear = () => {
    updateState(props._id, {
      prompt: '',
      code: '',
      output: '',
      executeInfo: { executeFunc: '', params: {} },
    });
  };

  return (
    <AppWindow app={props}>
      <Box // main container
        w={'100%'}
        h={'100%'}
        bg={useColorModeValue('#F0F2F6', '#141414')}
        overflowY={'scroll'}
        css={{
          '&::-webkit-scrollbar': {
            width: '.5em',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'teal',
            borderRadius: '10px',
          },
        }}
      >
        <Stack m={2}>
          <Box // generation section container
            h={'100%'}
            border={'2px solid'}
            borderColor={'#008080'}
            borderRadius={'md'}
            style={{
              backgroundColor: useColorModeValue('#FFFFFF', '#141414'),
              fontFamily: 'monospace',
              fontSize: s.fontSize + 'px',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              minHeight: '150px',
            }}
          >
            <HStack m={2}>
              <Textarea
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.shiftKey && access && s.kernel) {
                    handleGenerate(s.kernel);
                  }
                }}
                value={s.prompt}
                onChange={updatePrompt}
                placeholder="Enter prompt..."
                _placeholder={{ color: useColorModeValue('gray.900', 'gray.100') }}
                bg={useColorModeValue('white', 'gray.900')}
                color={useColorModeValue('black', 'white')}
                _focus={{
                  border: 'transparent',
                  boxShadow: 'none',
                }}
                w={'100%'}
                h={'100%'}
                fontSize={s.fontSize}
                fontFamily={'monospace'}
                minH={'150px'}
                border={'none'}
                resize={'none'}
                disabled={!access || !s.kernel}
              />
              <ButtonGroup isAttached variant="outline" size="lg" orientation="vertical">
                {access ? (
                  <Tooltip hasArrow label="Generate" placement="right-start">
                    <IconButton
                      onClick={() => handleGenerate(s.kernel)}
                      aria-label={''}
                      icon={
                        s.executeInfo?.executeFunc === 'generate' ? (
                          <Spinner size="sm" color="teal.500" />
                        ) : (
                          <MdPlayArrow size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />
                        )
                      }
                    />
                  </Tooltip>
                ) : null}
                {access ? (
                  <Tooltip hasArrow label="Stop" placement="right-start">
                    <IconButton
                      onClick={handleInterrupt}
                      aria-label={''}
                      disabled={user?._id !== s.kernel ? false : true}
                      icon={<MdStop size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
                    />
                  </Tooltip>
                ) : null}
                {access ? (
                  <Tooltip hasArrow label="Clear All" placement="right-start">
                    <IconButton
                      onClick={handleClear}
                      aria-label={''}
                      disabled={user?._id !== s.kernel ? false : true}
                      icon={<MdClearAll size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
                    />
                  </Tooltip>
                ) : null}
              </ButtonGroup>
            </HStack>
          </Box>
        </Stack>
        <Divider mt={2} />
        <Stack m={2}>
          <Box // input section container
            h={'100%'}
            w={'100%'}
            bgColor={useColorModeValue('#FFFFFE', '#111111')}
            style={{
              fontFamily: 'monospace',
              fontSize: s.fontSize + 'px',
              color: useColorModeValue('#000000', '#FFFFFF'),
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              minHeight: '150px',
              border: '2px solid',
              borderColor: '#008080',
              borderRadius: '6px',
            }}
          >
            <HStack m={2}>{<InputBox app={props} access={true} />}</HStack>
          </Box>
          <Divider />
          <Box // output section container
            border="2px solid"
            borderColor="#008080"
            bg={useColorModeValue('#F0F2F6', '#111111')}
            fontFamily="monospace"
            whiteSpace="pre-wrap"
            overflowWrap="break-word"
            style={{
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: s.fontSize + 'px',
              color: useColorModeValue('#000000', '#FFFFFF'),
              minHeight: '150px',
              padding: '10px',
              borderRadius: '6px',
            }}
          >
            {!s.output ? <></> : <OutputBox output={s.output} app={props} />}
          </Box>
        </Stack>
      </Box>
    </AppWindow>
  );
}

/*************************************************
 *
 * InputBox.tsx
 *
 */
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

  // Register a new command to evaluate the code
  useEffect(() => {
    if (editor.current) {
      // only allow shift + enter to execute code if the user has access and
      // the textarea is in focus
      if (props.access && editor.current.hasTextFocus()) {
        editor.current.addAction({
          id: 'execute',
          label: 'Execute',
          keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
          run: () => handleExecute(s.kernel),
        });
      }
    }
  }, [s.kernel, editor.current]);

  const handleExecute = (kernel: string) => {
    const code = editor.current?.getValue();
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

  useEffect(() => {
    if (s.code !== code) {
      setCode(s.code);
    }
  }, [s.code]);

  // handle interrupt
  const handleInterrupt = () => {
    if (!user) return;
    updateState(props.app._id, {
      executeInfo: { executeFunc: 'interrupt', params: { user_uuid: user._id } },
    });
  };

  // Update from Monaco Editor
  function updateCode(value: string | undefined) {
    if (value) {
      // Store the code in the state
      setCode(value);
    }
  }

  useEffect(() => {
    // update local state from global state
    setFontSize(s.fontSize);
  }, [s.fontSize]);

  // Get the reference to the Monaco Editor after it mounts
  function handleEditorDidMount(ed: Monaco) {
    editor.current = ed;
  }

  return (
    <>
      <Editor
        onMount={handleEditorDidMount}
        value={code}
        onChange={updateCode}
        defaultLanguage="python"
        height={'15vh'}
        language={'python'}
        theme={colorMode === 'light' ? 'vs-light' : 'vs-dark'}
        options={{
          fontSize: fontSize,
          minimap: { enabled: false },
          lineNumbersMinChars: 4,
          automaticLayout: true,
          quickSuggestions: false,
        }}
      />
      <ButtonGroup isAttached variant="outline" size="lg" orientation="vertical">
        {props.access ? (
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
            />
          </Tooltip>
        ) : null}
        {props.access ? (
          <Tooltip hasArrow label="Stop" placement="right-start">
            <IconButton
              onClick={handleInterrupt}
              aria-label={''}
              disabled={user?._id !== s.kernel ? false : true}
              icon={<MdStop size={'1.5em'} color="#008080" />}
            />
          </Tooltip>
        ) : null}

        {props.access ? (
          <Tooltip hasArrow label="Clear All" placement="right-start">
            <IconButton
              onClick={handleClear}
              aria-label={''}
              disabled={user?._id !== s.kernel ? false : true}
              icon={<MdClearAll size={'1.5em'} color="#008080" />}
            />
          </Tooltip>
        ) : null}
      </ButtonGroup>
    </>
  );
};

/******************************************
 *
 * OutputBox.tsx
 *
 */
type OutputBoxProps = {
  output: string;
  app: App;
};

const OutputBox = (props: OutputBoxProps): JSX.Element => {
  const parsedJSON = JSON.parse(props.output);
  const s = props.app.data.state as AppState;
  if (!props.output) return <></>;
  if (typeof props.output === 'object' && Object.keys(props.output).length === 0) return <></>;
  return (
    <>
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
      {!parsedJSON.error ? null : !Array.isArray(parsedJSON.error) ? (
        <>
          <Alert status="error">{`${parsedJSON.error.ename}: ${parsedJSON.error.evalue}`}</Alert>
          <Ansi>{parsedJSON.error.traceback.join('\n')}</Ansi>
        </>
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
    </>
  );
};

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

/**
 * UI toolbar for the Seer application
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
  const [myKernels, setMyKernels] = useState(s.kernels);
  const [access, setAccess] = useState(true);

  function getKernels() {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'get_available_kernels',
        params: { user_uuid: user._id },
      },
    });
  }

  useEffect(() => {
    getKernels();
  }, []);

  useEffect(() => {
    // Get all kernels that I'm available to see
    const kernels: any[] = [];
    s.kernels.forEach((kernel) => {
      if (kernel.value.is_private) {
        if (kernel.value.owner_uuid == user?._id) {
          kernels.push(kernel);
        }
      } else {
        kernels.push(kernel);
      }
    });
    setMyKernels(kernels);
  }, [JSON.stringify(s.kernels)]);

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

  // // Download the stickie as a text file
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
    <HStack>
      {
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

          <Tooltip placement="top-start" hasArrow={true} label={'Refresh Kernel List'} openDelay={400}>
            <Button onClick={getKernels} _hover={{ opacity: 0.7 }} size="xs" mx="1" colorScheme="teal">
              <MdRefresh />
            </Button>
          </Tooltip>

          <ButtonGroup isAttached size="xs" colorScheme="teal">
            <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
              <Button
                isDisabled={s.fontSize <= 8}
                onClick={() => updateState(props._id, { fontSize: Math.max(10, s.fontSize - 2) })}
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
        </>
      }
    </HStack>
  );
}

export default { AppComponent, ToolbarComponent };

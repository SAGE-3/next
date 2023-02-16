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
  AspectRatio,
  Avatar,
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
  Tag,
  TagCloseButton,
  TagLabel,
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
import './styles.css';
import { MdAdd, MdArrowDropDown, MdClearAll, MdFileDownload, MdPlayArrow, MdRefresh, MdRemove, MdStop } from 'react-icons/md';
import { useEffect, useRef, useState } from 'react';

// import AceEditor from "react-ace";
import { v4 as getUUID } from 'uuid';
import Ansi from 'ansi-to-react';

// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

import Editor, { DiffEditor, loader, Monaco, useMonaco } from '@monaco-editor/react';
import { User } from '@sage3/shared/types';

/* App component for Seer */

function AppComponent(props: App): JSX.Element {
  // Make a toast to show errors
  const toast = useToast();
  const { user } = useUser();
  const s = props.data.state as AppState;
  const [access, setAccess] = useState<boolean>(true);
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const [prompt, setPrompt] = useState<string>(s.prompt);
  const defaultPlaceHolderValue = 'Tell me what you want to do...';
  const [placeHolderValue, setPlaceHolderValue] = useState<string>(defaultPlaceHolderValue);
  // const [activeUser, setActiveUser] = useState<User>();
  // const [activeUserList, setActiveUserList] = useState<User[]>([]);
  const SPACE = 2;

  // Set the initial size of the window
  useEffect(() => {
    update(props._id, {
      size: {
        width: 1000,
        height: 525,
        depth: 1,
      },
    });
  }, []);

  const handleUpdatePrompt = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  useEffect(() => {
    if (s.prompt !== prompt) {
      setPrompt(s.prompt);
    }
  }, [s.prompt]);

  // Update the state when the kernel changes
  useEffect(() => {
    updateState(props._id, {
      kernel: s.kernel,
    });
  }, [s.kernel]);

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
        code: '',
        output: '',
        executeInfo: { executeFunc: 'generate', params: { _uuid: getUUID() } },
      });
    }
  };
  // handle interrupt
  const handleInterrupt = () => {
    if (!user) return;
    updateState(props._id, {
      executeInfo: { executeFunc: 'interrupt', params: {} },
    });
  };
  const handleClear = () => {
    updateState(props._id, {
      prompt: '',
      output: '',
      executeInfo: { executeFunc: '', params: {} },
    });
  };

  return (
    <AppWindow app={props}>
      <Box // main container
        style={{
          backgroundColor: useColorModeValue('#F0F2F6', '#141414'),
          color: useColorModeValue('#000000', '#FFFFFF'),
          fontFamily: 'monospace',
          fontSize: s.fontSize + 'px',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          width: '100%',
          height: '100%',
          overflowY: 'auto',
        }}
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
        <Stack m={SPACE} mb={SPACE / 2}>
          <Stack direction="row" mb={-2} mt={-1}>
            <Badge
              variant="outline"
              colorScheme="green"
              onMouseOver={() => setPlaceHolderValue('Load the file named "test.csv"')}
              onMouseLeave={() => setPlaceHolderValue(defaultPlaceHolderValue)}
            >
              Load a file
            </Badge>
            <Badge
              variant="outline"
              colorScheme="green"
              onMouseOver={() => setPlaceHolderValue('Select the first 10 rows of the dataframe named "working_df"')}
              onMouseLeave={() => setPlaceHolderValue(defaultPlaceHolderValue)}
            >
              Query a dataframe
            </Badge>
            <Badge
              variant="outline"
              colorScheme="green"
              onMouseOver={() => setPlaceHolderValue('Show me a histogram based on the column "age"')}
              onMouseLeave={() => setPlaceHolderValue(defaultPlaceHolderValue)}
            >
              Create a visualization
            </Badge>
          </Stack>
          <Box // generation section container
            style={{
              height: '100%',
              backgroundColor: useColorModeValue('#FFFFFE', '#111111'),
              minHeight: '150px',
              border: '2px solid',
              borderColor: '#008080',
              borderRadius: 'md',
            }}
          >
            <HStack mr={SPACE}>
              <Textarea
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.shiftKey && access && s.kernel) {
                    handleGenerate(s.kernel);
                  }
                }}
                value={prompt}
                // value={user === activeUser || activeUser === undefined ? prompt : `[Locked by ${activeUser?.data.name}]` + s.prompt}
                onChange={handleUpdatePrompt}
                placeholder={placeHolderValue}
                _placeholder={{
                  color: useColorModeValue('gray.900', 'gray.100'),
                }}
                style={{
                  backgroundColor: useColorModeValue('#FFFFFE', '#202020'),
                  width: '100%',
                  height: '100%',
                  fontSize: s.fontSize + 'px',
                  minHeight: '150px',
                }}
                _focus={{
                  border: 'transparent',
                  boxShadow: 'none',
                }}
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
                      disabled={!s.kernel}
                    />
                  </Tooltip>
                ) : null}
                {access ? (
                  <Tooltip hasArrow label="Stop" placement="right-start">
                    <IconButton
                      onClick={handleInterrupt}
                      aria-label={''}
                      disabled={!s.kernel}
                      icon={<MdStop size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
                      hidden={s.executeInfo?.executeFunc === 'generate' ? false : true}
                    />
                  </Tooltip>
                ) : null}
                {access ? (
                  <Tooltip hasArrow label="Clear All" placement="right-start">
                    <IconButton
                      onClick={handleClear}
                      aria-label={''}
                      disabled={!s.kernel}
                      icon={<MdClearAll size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
                    />
                  </Tooltip>
                ) : null}
              </ButtonGroup>
            </HStack>
          </Box>
          <Stack direction="row">
            <Badge variant="outline" colorScheme="facebook" mb={-2} mt={-1}>
              Edit and Execute Code (Shift + Enter)
            </Badge>
          </Stack>
          <Box // input section container
            style={{
              height: '100%',
              width: '100%',
              backgroundColor: useColorModeValue('#FFFFFE', '#111111'),
              minHeight: '150px',
              border: '2px solid',
              borderColor: '#008080',
              marginBottom: '-4px',
            }}
          >
            <HStack mr={SPACE}>{<InputBox app={props} access={true} />}</HStack>
          </Box>
          <Stack direction="row">
            <Badge variant="outline" colorScheme="red" mb={-2}>
              Output Box
            </Badge>
          </Stack>
          {/* </Box> */}
          <Box // output section container
            style={{
              backgroundColor: useColorModeValue('#FFFFFE', '#202020'),
              // minHeight: '150px',
              border: '2px solid',
              borderColor: '#008080',
              // overflow: 'auto',
              // resize: 'vertical',
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
      editor.current.addAction({
        id: 'execute',
        label: 'Execute',
        keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
        run: () => handleExecute(s.kernel),
      });
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

  return (
    <>
      <Editor
        value={code}
        defaultLanguage="python"
        // height={'16vh'}
        height={'148px'}
        width={`calc(100% - ${props.access ? 50 : 0}px)`}
        language={'python'}
        theme={colorMode === 'light' ? 'vs-light' : 'vs-dark'}
        options={{
          fontSize: fontSize,
          minimap: { enabled: true },
          lineNumbers: 'off',
          automaticLayout: true,
          quickSuggestions: false,
          scrollBeyondLastLine: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          glyphMargin: false,
        }}
        onChange={() => setCode(editor.current?.getValue() || '')}
        onMount={handleEditorDidMount}
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
              disabled={!s.kernel}
            />
          </Tooltip>
        ) : null}
        {props.access ? (
          <Tooltip hasArrow label="Stop" placement="right-start">
            <IconButton
              onClick={handleInterrupt}
              hidden={s.executeInfo?.executeFunc === 'execute' ? false : true}
              aria-label={''}
              disabled={!s.kernel}
              icon={<MdStop size={'1.5em'} color="#008080" />}
            />
          </Tooltip>
        ) : null}

        {props.access ? (
          <Tooltip hasArrow label="Clear All" placement="right-start">
            <IconButton onClick={handleClear} aria-label={''} disabled={!s.kernel} icon={<MdClearAll size={'1.5em'} color="#008080" />} />
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
  if (!props.output) return <></>;
  const parsedJSON = JSON.parse(props.output);
  const [data, setData] = useState<any>(null);
  const [executionCount, setExecutionCount] = useState<number>(0);
  const s = props.app.data.state as AppState;

  useEffect(() => {
    if (parsedJSON.execute_result) {
      setData(parsedJSON.execute_result.data);
      if (parsedJSON.execute_result.execution_count) {
        setExecutionCount(parsedJSON.execute_result.execution_count);
      } else {
        setExecutionCount(0);
      }
    }
    if (parsedJSON.display_data) {
      setData(parsedJSON.display_data.data);
    }
  }, [props.output]);

  if (typeof props.output === 'object' && Object.keys(props.output).length === 0) return <></>;
  return (
    <>
      <div
        style={{
          padding: '0.5em',
          boxShadow: 'inset 0 0 6px 2px rgb(0 0 0 / 30%)',
          resize: 'vertical',
        }}
      >
        {executionCount > 0 ? (
          <Text fontSize={s.fontSize} color="red.500">
            {`[${executionCount}]: `}
          </Text>
        ) : null}
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
          <Text>{parsedJSON.stream.text}</Text>
        ) : (
          <Text color="red">{parsedJSON.stream.text}</Text>
        )}

        {!data
          ? null
          : Object.keys(data).map((key, i) => {
              switch (key) {
                case 'text/plain':
                  if (data['text/html']) return <></>;
                  return <Text key={i}>{data[key]}</Text>;
                case 'text/html':
                  const html = data[key].replace('\n', '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                  return <div key={i} dangerouslySetInnerHTML={{ __html: html }} />;
                case 'image/png':
                  return <Image key={i} src={`data:image/png;base64,${data[key]}`} />;
                case 'image/svg+xml':
                  return <Image key={i} src={`data:image/svg+xml;base64,${data[key]}`} />;
                default:
                  return <MapJSONObject key={i} data={data[key]} />;
              }
            })}
      </div>
    </>
  );
};

const MapJSONObject = (obj: any): JSX.Element => {
  if (!obj) return <></>;
  if (typeof obj === 'object' && Object.keys(obj).length === 0) return <></>;
  return (
    <Box pl={2} bg={useColorModeValue('#FFFFFF', '#000000')} fontSize={'16px'} color={useColorModeValue('#000000', '#FFFFFF')}>
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

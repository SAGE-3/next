/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { downloadFile, truncateWithEllipsis, useAppStore, useHexColor, useUser, useUsersStore } from '@sage3/frontend';
import {
  // Alert,
  // AlertIcon,
  Badge,
  Box,
  // Button,
  ButtonGroup,
  HStack,
  IconButton,
  // Image,
  // Modal,
  // ModalOverlay,
  // ModalContent,
  // ModalHeader,
  // ModalFooter,
  // ModalBody,
  // Select,
  Spacer,
  Spinner,
  Stack,
  // Text,
  Textarea,
  Tooltip,
  // useColorMode,
  useColorModeValue,
  useToast,
  useDisclosure,
  // Kbd,
  // Flex,
  // Accordion,
  // AccordionItem,
  // AccordionIcon,
  // AccordionButton,
  // AccordionPanel,
  // Icon,
} from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styles.css';
import {
  // MdAdd,
  // MdArrowDropDown,
  MdClearAll,
  // MdError,
  // MdFileDownload,
  MdHelp,
  MdPlayArrow,
  // MdRefresh,
  // MdRemove,
  MdStop,
} from 'react-icons/md';
import { useEffect, useRef, useState } from 'react';

// import AceEditor from "react-ace";
import { v4 as getUUID } from 'uuid';
// import Ansi from 'ansi-to-react';

// Date manipulation (for filename)
// import dateFormat from 'date-fns/format';

// import Editor, { Monaco, useMonaco } from '@monaco-editor/react';

// import imgSource from './seer_icon.png';
// import docsImageSource from './sage3-docs-how-to-use.png';

import { ToolbarComponent } from './components/toolbar';
import { HelpModal } from './components/help';
import { Outputs } from './components/outputs';
import { CodeEditor } from './components/editor';
import { TopBar } from './components/status';

/**
 * Seer App
 */

/**
 * Props for help modal
 */
// type HelpProps = {
//   onClose: () => void;
//   isOpen: boolean;
// };

// /**
//  * Help modal for Seer app
//  * @param props
//  * @returns
//  */
// export function HelpModal(props: HelpProps) {
//   return (
//     <Modal isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false} isCentered={true} size="xl">
//       <ModalOverlay />
//       <ModalContent>
//         <ModalHeader>
//           <Stack direction="row">
//             <Image boxSize={'32px'} src={imgSource} alt="SAGE3 Help" />
//             <Text>SAGE3 Seer Help</Text>
//           </Stack>
//         </ModalHeader>
//         <ModalBody>
//           <Box mb={4}>
//             <Text fontSize="lg">
//               Welcome to <b>Seer</b> - a powerful tool for generating code that currently focuses on working with Pandas dataframes.
//             </Text>
//             <Text fontSize="md" mt={2}>
//               Whether you're a seasoned programmer or have little to no experience, Seer is designed to be flexible and extensible, allowing
//               you to start wrangling and analyzing data right away.
//             </Text>
//           </Box>
//           <Box mb={4}>
//             <Text fontSize="md">
//               To generate code, simply enter a natural language prompt in the first input box, and then press <Kbd>Shift</Kbd> +{' '}
//               <Kbd>Enter</Kbd> or the play button to begin the process.
//             </Text>
//             <Text fontSize="md" mt={2}>
//               The generated code will appear in the second input box, which is a code editor. You can edit the code to fit your needs, and
//               then run it again using the play button or <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd>. If you change your mind or want to stop the
//               process, simply press the stop button.
//             </Text>
//           </Box>
//           <Box mb={4}>
//             <Text fontSize="md">Use the button group below the input boxes to execute, stop, or clear the code editor:</Text>
//             <ButtonGroup isAttached variant="outline" size="lg">
//               <Tooltip hasArrow label="Execute" placement="right-start">
//                 <IconButton aria-label={''} icon={<MdPlayArrow size={'1.5em'} color="#008080" />} />
//               </Tooltip>
//               <Tooltip hasArrow label="Stop" placement="right-start">
//                 <IconButton aria-label={''} icon={<MdStop size={'1.5em'} color="#008080" />} />
//               </Tooltip>
//               <Tooltip hasArrow label="Clear All" placement="right-start">
//                 <IconButton aria-label={''} icon={<MdClearAll size={'1.5em'} color="#008080" />} />
//               </Tooltip>
//             </ButtonGroup>
//           </Box>
//           <Box>
//             <Text fontSize="md">
//               The output of the code will be displayed in the third box. Use the toolbar at the bottom of the page to select from one of the
//               available kernels to get started!
//             </Text>
//           </Box>
//           <Box mt={4}>
//             <Text fontSize="md">
//               If you have any questions, comments, or suggestions, please contact the SAGE3 team or scan the following QR code to visit the
//               SAGE3 docs.
//             </Text>
//           </Box>
//           <Box mt={4}></Box>
//           <Flex justifyContent="center" alignItems="center">
//             <Image boxSize={'48px'} src={docsImageSource} alt="SAGE3 Docs" />
//           </Flex>
//         </ModalBody>
//         <ModalFooter>
//           <Button colorScheme="green" size="sm" mr={3} onClick={props.onClose}>
//             Close
//           </Button>
//         </ModalFooter>
//       </ModalContent>
//     </Modal>
//   );
// }

/* App component for Seer */
function AppComponent(props: App): JSX.Element {
  // Make a toast to show errors
  const toast = useToast();
  const { user } = useUser();
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const [prompt, setPrompt] = useState<string>(s.prompt);
  const defaultPlaceHolderValue = 'Tell me what you want to do...';
  const [placeHolderValue, setPlaceHolderValue] = useState<string>(defaultPlaceHolderValue);
  const [myKernels, setMyKernels] = useState(s.kernels);
  const [access, setAccess] = useState<boolean>(false);
  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A');
  const boardId = props.data.boardId;
  const SPACE = 2;
  // Help modal
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();
  // Needed for Div resizing
  const [editorHeight, setEditorHeight] = useState(150); // not beign used?
  const accessDeniedColor = useColorModeValue('#EFDEDD', '#9C7979');

  function getKernels() {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'get_available_kernels',
        params: { _uuid: user._id },
      },
    });
  }

  // Set the title on start
  useEffect(() => {
    // update the title of the app
    if (props.data.title !== 'Seer') {
      update(props._id, { title: 'Seer' });
    }
    getKernels();
  }, []);

  useEffect(() => {
    // Get all kernels that I'm available to see
    const kernels: { value: Record<string, any>; key: string }[] = [];
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
      setAccess(true); // need to check this...it's weird
    } else {
      const access = myKernels.find((kernel) => kernel.key === s.kernel);
      setAccess(access ? true : false);
      if (access) {
        const name = truncateWithEllipsis(access ? access.value.kernel_alias : s.kernel, 8);
        // update the title of the app
        update(props._id, { title: 'Seer: kernel [' + name + ']' });
      }
    }
  }, [s.kernel, myKernels]);

  // handle mouse move event
  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = e.movementY;
    handleEditorResize(deltaY);
  };

  // handle mouse up event
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleEditorResize = (deltaY: number) => {
    setEditorHeight((prevHeight) => prevHeight + deltaY); // update the Monaco editor height
  };

  useEffect(() => {
    const editor = document.querySelector('.monaco-editor');
    if (editor) {
      const editorHeight = editor.clientHeight;
      setEditorHeight(editorHeight);
    }
  }, [s.kernel]);

  const handleUpdatePrompt = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  useEffect(() => {
    if (s.prompt !== prompt) {
      setPrompt(s.prompt);
    }
  }, [s.prompt]);

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
          fontFamily:
            "\
          -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', \
          'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',\
          ",
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
        <HelpModal isOpen={helpIsOpen} onClose={helpOnClose} />
        <Stack m={SPACE} mb={SPACE / 2}>
          {/* <TopBar kernel={s.kernel} access={access} isTyping={s.isTyping} bgColor={bgColor} /> */}
          <Stack direction="row" mb={-1} mt={-1}>
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
            <Spacer />
            <Tooltip label="Click for help" placement="top">
              <IconButton
                onClick={() => helpOnOpen()}
                aria-label="Get Help"
                colorScheme={'green'}
                icon={<MdHelp size={'18px'} />}
                variant={'ghost'}
                _active={{ backgroundColor: 'transparent' }}
                _focus={{ backgroundColor: 'transparent' }}
                _hover={{ backgroundColor: 'transparent' }}
                size={'24px'}
              />
            </Tooltip>
            {!s.kernel && !access ? ( // no kernel selected and no access
              <Badge variant="outline" colorScheme="red">
                Offline{' '}
              </Badge>
            ) : !s.kernel && access ? ( // no kernel selected but access
              <Badge variant="outline" colorScheme="red">
                Error{' '}
              </Badge>
            ) : s.kernel && !access ? ( // kernel selected but no access
              <Badge variant="outline" colorScheme="red">
                No Access{' '}
              </Badge>
            ) : s.kernel && access ? ( // kernel selected and access
              <Badge variant="outline" colorScheme="green">
                Online{' '}
              </Badge>
            ) : null}
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
                onChange={handleUpdatePrompt}
                placeholder={placeHolderValue}
                _placeholder={{
                  opacity: 0.5,
                  color: useColorModeValue('#000000', '#FFFFFF'),
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
                isDisabled={!access || !s.kernel}
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
                      isDisabled={!s.kernel}
                    />
                  </Tooltip>
                ) : null}
                {access ? (
                  <Tooltip hasArrow label="Stop" placement="right-start">
                    <IconButton
                      onClick={handleInterrupt}
                      aria-label={''}
                      isDisabled={!s.kernel}
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
                      isDisabled={!s.kernel}
                      icon={<MdClearAll size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
                    />
                  </Tooltip>
                ) : null}
              </ButtonGroup>
            </HStack>
          </Box>
          <Stack direction="row">
            <Badge variant="outline" colorScheme="facebook" mb={-1} mt={-1}>
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
            {/* <HStack mr={SPACE}>{<InputBox app={props} />}</HStack> */}
            <HStack mr={SPACE}>{<CodeEditor app={props} access={access} editorHeight={editorHeight} />}</HStack>
          </Box>
          <Stack direction="row">
            <Badge variant="outline" colorScheme="red" mb={-1}>
              Output Box
            </Badge>
          </Stack>
          {/* </Box> */}
          <Box // output section container
            style={{
              backgroundColor: useColorModeValue('#FFFFFE', '#202020'),
              minHeight: '150px',
              border: '2px solid',
              borderColor: '#008080',
            }}
          >
            {/* {!s.output ? <></> : <OutputBox output={s.output} app={props} />} */}
            {!s.output ? <></> : <Outputs output={s.output} app={props} />}
          </Box>
        </Stack>
      </Box>
    </AppWindow>
  );
}

// /*************************************************
//  *
//  * InputBox.tsx
//  *
//  */
// type InputBoxProps = {
//   app: App;
// };

// /**
//  *
//  * @param props
//  * @returns
//  */
// const InputBox = (props: InputBoxProps): JSX.Element => {
//   const s = props.app.data.state as AppState;
//   const updateState = useAppStore((state) => state.updateState);
//   // Reference to the editor
//   const editor = useRef<Monaco>();
//   const [code, setCode] = useState<string>(s.code);
//   const { user } = useUser();
//   const { colorMode } = useColorMode();
//   const [fontSize, setFontSize] = useState(s.fontSize);
//   // Make a toast to show errors
//   const toast = useToast();
//   // Handle to the Monoco API
//   const monaco = useMonaco();
//   const [myKernels, setMyKernels] = useState<{ value: Record<string, any>; key: string }[]>([]);
//   const [access, setAccess] = useState<boolean>(false);
//   const [kernel, setKernel] = useState(s.kernel);
//   const boardId = props.app.data.boardId;

//   useEffect(() => {
//     // Get all kernels that I'm available to see
//     const kernels: any[] = [];
//     s.kernels
//       // filter kernels to show this board kernels only
//       .filter((kernel) => kernel.value.board === boardId)
//       // filter kernels to show pulic or private kernels that I own
//       .forEach((kernel) => {
//         if (kernel.value.is_private) {
//           if (kernel.value.owner_uuid == user?._id) {
//             kernels.push(kernel);
//           }
//         } else {
//           kernels.push(kernel);
//         }
//       });
//     setMyKernels(kernels);
//   }, [JSON.stringify(s.kernels)]);

//   // Check if I have access to the selected kernel
//   useEffect(() => {
//     if (!s.kernel || s.kernel === '') {
//       setAccess(false);
//     } else {
//       const access = myKernels.find((kernel) => kernel.key == s.kernel);
//       setAccess(access ? true : false);
//     }
//   }, [s.kernel, myKernels]);

//   useEffect(() => {
//     if (editor.current) {
//       editor.current.addAction({
//         id: 'execute',
//         label: 'Execute',
//         keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
//         run: () => handleExecute(s.kernel),
//       });
//     }
//   }, [s.kernel, editor.current]);

//   const handleExecute = (kernel: string) => {
//     const code = editor.current?.getValue();
//     if (!kernel) {
//       toast({
//         title: 'No kernel selected',
//         description: 'Please select a kernel from the toolbar',
//         status: 'error',
//         duration: 4000,
//         isClosable: true,
//         position: 'bottom',
//       });
//       return;
//     }
//     if (code) {
//       updateState(props.app._id, {
//         code: code,
//         output: '',
//         executeInfo: { executeFunc: 'execute', params: { _uuid: getUUID() } },
//       });
//     }
//   };

//   const handleClear = () => {
//     updateState(props.app._id, {
//       code: '',
//       output: '',
//       executeInfo: { executeFunc: '', params: {} },
//     });
//     editor.current?.setValue('');
//   };

//   useEffect(() => {
//     if (s.code !== code) {
//       setCode(s.code);
//     }
//   }, [s.code]);

//   // handle interrupt
//   const handleInterrupt = () => {
//     if (!user) return;
//     updateState(props.app._id, {
//       executeInfo: { executeFunc: 'interrupt', params: {} },
//     });
//   };

//   useEffect(() => {
//     // update local state from global state
//     setFontSize(s.fontSize);
//   }, [s.fontSize]);

//   // Get the reference to the Monaco Editor after it mounts
//   function handleEditorDidMount(ed: Monaco) {
//     editor.current = ed;
//   }

//   useEffect(() => {
//     if (s.kernel !== kernel) {
//       setKernel(s.kernel);
//     }
//   }, [s.kernel]);

//   return (
//     <>
//       <Editor
//         value={code}
//         defaultLanguage="python"
//         height={'148px'}
//         width={`calc(100% - ${access ? 50 : 0}px)`}
//         language={'python'}
//         theme={colorMode === 'light' ? 'vs-light' : 'vs-dark'}
//         options={{
//           fontSize: fontSize,
//           minimap: { enabled: true },
//           lineNumbers: 'off',
//           automaticLayout: true,
//           quickSuggestions: false,
//           scrollBeyondLastLine: false,
//           lineDecorationsWidth: 0,
//           lineNumbersMinChars: 0,
//           glyphMargin: false,
//           readOnlyMessage: 'You do not have access to this kernel',
//           readOnly: !access,
//         }}
//         onChange={() => setCode(editor.current?.getValue() || '')}
//         onMount={handleEditorDidMount}
//       />
//       {access ? (
//         <ButtonGroup isAttached variant="outline" size="lg" orientation="vertical">
//           <Tooltip hasArrow label="Execute" placement="right-start">
//             <IconButton
//               onClick={() => handleExecute(s.kernel)}
//               aria-label={''}
//               icon={
//                 s.executeInfo?.executeFunc === 'execute' ? (
//                   <Spinner size="sm" color="teal.500" />
//                 ) : (
//                   <MdPlayArrow size={'1.5em'} color="#008080" />
//                 )
//               }
//               isDisabled={!s.kernel}
//             />
//           </Tooltip>
//           <Tooltip hasArrow label="Stop" placement="right-start">
//             <IconButton
//               onClick={handleInterrupt}
//               hidden={s.executeInfo?.executeFunc === 'execute' ? false : true}
//               aria-label={''}
//               isDisabled={!s.kernel}
//               icon={<MdStop size={'1.5em'} color="#008080" />}
//             />
//           </Tooltip>
//           <Tooltip hasArrow label="Clear All" placement="right-start">
//             <IconButton onClick={handleClear} aria-label={''} isDisabled={!s.kernel} icon={<MdClearAll size={'1.5em'} color="#008080" />} />
//           </Tooltip>
//         </ButtonGroup>
//       ) : null}
//     </>
//   );
// };

// /******************************************
//  *
//  * OutputBox.tsx
//  *
//  */
// type OutputBoxProps = {
//   output: string;
//   app: App;
// };

// const OutputBox = (props: OutputBoxProps): JSX.Element => {
//   if (!props.output) return <></>;
//   const parsedJSON = JSON.parse(props.output);
//   const users = useUsersStore((state) => state.users);
//   const [ownerColor, setOwnerColor] = useState<string>('#000000');
//   const createApp = useAppStore((state) => state.create);
//   const [data, setData] = useState<any>(null);
//   const [executionCount, setExecutionCount] = useState<number>(0);
//   const s = props.app.data.state as AppState;

//   useEffect(() => {
//     if (s.kernel && users) {
//       const owner = s.kernels.find((el) => el.key === s.kernel)?.value.owner_uuid;
//       const ownerColor = users.find((el) => el._id === owner)?.data.color;
//       setOwnerColor(ownerColor || '#000000');
//     }
//   }, [s.kernel, users]);

//   useEffect(() => {
//     if (parsedJSON.execute_result) {
//       setData(parsedJSON.execute_result.data);
//       if (parsedJSON.execute_result.execution_count) {
//         setExecutionCount(parsedJSON.execute_result.execution_count);
//       } else {
//         setExecutionCount(0);
//       }
//     }
//     if (parsedJSON.display_data) {
//       setData(parsedJSON.display_data.data);
//     }
//   }, [props.output]);

//   const startSageCell = (kernelId: string, kernelAlias: string) => {
//     createApp({
//       title: `${kernelAlias}`,
//       roomId: props.app.data.roomId,
//       boardId: props.app.data.boardId,
//       position: { x: props.app.data.position.x + props.app.data.size.width + 20, y: props.app.data.position.y, z: 0 },
//       size: { width: 600, height: props.app.data.size.height, depth: 0 },
//       rotation: { x: 0, y: 0, z: 0 },
//       type: 'SageCell',
//       state: {
//         code: '',
//         language: 'python',
//         fontSize: 16,
//         theme: 'xcode',
//         kernel: kernelId,
//         availableKernels: [],
//         privateMessage: [],
//         output: '',
//         executeInfo: { executeFunc: '', params: {} },
//       },
//       raised: true,
//     });
//   };

//   const startWebview = (url: string): void => {
//     // console.log('startWebvew', url);
//     createApp({
//       title: `Webview`,
//       roomId: props.app.data.roomId,
//       boardId: props.app.data.boardId,
//       position: { x: props.app.data.position.x + props.app.data.size.width + 20, y: props.app.data.position.y, z: 0 },
//       size: { width: 600, height: props.app.data.size.height, depth: 0 },
//       rotation: { x: 0, y: 0, z: 0 },
//       type: 'Webview',
//       state: {
//         webviewurl: url,
//         zoom: 1.0,
//       },
//       raised: true,
//     });
//   };

//   if (typeof props.output === 'object' && Object.keys(props.output).length === 0) return <></>;
//   return (
//     <>
//       <Box
//         style={{
//           background: useColorModeValue(`#f4f4f4`, `#1b1b1b`),
//           padding: `.5em`,
//           display: `block`,
//           borderLeft: `0.2em solid ${useHexColor(ownerColor)}`,
//           pageBreakInside: `avoid`,
//           fontSize: `${s.fontSize}px`,
//         }}
//       >
//         {executionCount > 0 ? (
//           <Text fontSize={'14px'} color="red.500">
//             {`[${executionCount}]: `}
//           </Text>
//         ) : null}
//         {!parsedJSON.error ? null : !Array.isArray(parsedJSON.error) ? (
//           <>
//             <Alert status="error">{`${parsedJSON.error.ename}: ${parsedJSON.error.evalue}`}</Alert>
//             <Ansi>{parsedJSON.error.traceback.join('\n')}</Ansi>
//           </>
//         ) : null}

//         {!parsedJSON.stream ? null : parsedJSON.stream.name === 'stdout' ? (
//           <Ansi>{parsedJSON.stream.text}</Ansi>
//         ) : (
//           <div>
//             <Icon as={MdError} color="red.500" mr={2} mt={1} />
//             <Ansi>{parsedJSON.stream.text}</Ansi>
//           </div>
//         )}

//         {!data
//           ? null
//           : Object.keys(data).map((key, i) => {
//               switch (key) {
//                 case 'text/plain':
//                   if (data['text/html']) return <></>;
//                   return <Text key={i}>{data[key]}</Text>;
//                 case 'text/html':
//                   const html = data[key].replace('\n', '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
//                   return <Box key={i} dangerouslySetInnerHTML={{ __html: html }} />;
//                 case 'image/png':
//                   return <Image key={i} src={`data:image/png;base64,${data[key]}`} />;
//                 case 'image/svg+xml':
//                   return <Image key={i} src={`data:image/svg+xml;base64,${data[key]}`} />;
//                 case 'image/jpeg':
//                   return <Image key={i} src={`data:image/jpeg;base64,${data[key]}`} />;
//                 case 'text/markdown':
//                   return <Markdown markdown={data[key]} startWebview={startWebview} />;
//                 default:
//                   return (
//                     <Box>
//                       {/* Simple error message with a dropdown to show json  */}
//                       <Accordion allowToggle>
//                         <AccordionItem>
//                           <AccordionButton>
//                             <Box flex="1" textAlign="left">
//                               <Text color="red" fontWeight={'bold'} fontSize={s.fontSize}>
//                                 Error: {key} is not supported in this version of Seer.
//                               </Text>
//                             </Box>
//                             <AccordionIcon />
//                           </AccordionButton>
//                           <AccordionPanel pb={4}>
//                             <pre>
//                               <code>{JSON.stringify(data[key], null, 2)}</code>
//                             </pre>
//                           </AccordionPanel>
//                         </AccordionItem>
//                       </Accordion>
//                     </Box>
//                   );
//               }
//             })}
//       </Box>
//     </>
//   );
// };

// /**
//  * UI toolbar for the Seer application
//  *
//  * @param {App} props
//  * @returns {JSX.Element}
//  */
// function ToolbarComponent(props: App): JSX.Element {
//   // Access the global app state
//   const s = props.data.state as AppState;
//   const { user } = useUser();
//   const users = useUsersStore((state) => state.users);
//   // Update functions from the store
//   const update = useAppStore((state) => state.update);
//   const updateState = useAppStore((state) => state.updateState);
//   const boardId = props.data.boardId;
//   const [myKernels, setMyKernels] = useState<{ value: Record<string, any>; key: string }[]>([]);
//   // set to global kernel if it exists
//   const [selected, setSelected] = useState<string>(s.kernel);
//   const [ownerId, setOwnerId] = useState<string>('');
//   const [ownerName, setOwnerName] = useState<string>('');
//   const [isPrivate, setIsPrivate] = useState<boolean>(false);
//   const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();

//   /**
//    * This function gets the kernels for the board
//    * @returns
//    * @memberof ToolbarComponent
//    */
//   function getKernels() {
//     updateState(props._id, {
//       executeInfo: {
//         executeFunc: 'get_available_kernels',
//         params: {},
//       },
//     });
//   }

//   /**
//    * This function sets the state of the toolbar based on the kernels
//    * @returns
//    * @memberof ToolbarComponent
//    */
//   function setStates() {
//     const b = s.kernels.filter((el) => el.value.board === boardId);
//     if (!s.kernels || s.kernels.length === 0 || b.length === 0) {
//       setSelected('');
//       setOwnerId('');
//       setOwnerName('');
//       setIsPrivate(false);
//       update(props._id, { title: 'Seer> ' });
//       return;
//     }
//     if (b.length > 0) {
//       const publicKernels = b.filter((el) => !el.value.is_private);
//       const privateKernels = b.filter((el) => el.value.is_private);
//       const ownedKernels = privateKernels.filter((el) => el.value.owner_uuid === user?._id);
//       const myList: any[] = [...publicKernels, ...ownedKernels];
//       setMyKernels(myList);
//       // get the selected kernel from the global state
//       const selectedKernel = s.kernels.find((el) => el.key === s.kernel);
//       // check if the selected kernel is in the list of kernels for this board
//       const ownerId = selectedKernel?.value.owner_uuid;
//       const ownerName = users.find((u) => u._id === ownerId)?.data.name;
//       const isPrivate = selectedKernel?.value.is_private;
//       const inBoard = b.find((el) => el.key === selectedKernel?.key);
//       // if the selected kernel is not in the list of kernels for this board then
//       // there is a problem so we should reset the state to the default
//       if (!inBoard) {
//         setSelected('');
//         setOwnerId('');
//         setOwnerName('');
//         setIsPrivate(false);
//         return;
//       }
//       // const inMyList = myList.find((el) => el.key === s.kernel);
//       if (selectedKernel) {
//         setSelected(selectedKernel.key);
//         setOwnerId(ownerId);
//         setOwnerName(ownerName ? ownerName : '');
//         setIsPrivate(isPrivate ? isPrivate : false);
//       }
//     }
//   }

//   /**
//    * Get the kernels when the app is mounted and update the state
//    * This happens when the component is mounted but is not triggered
//    * when the global state changes so we need to use the useEffect below
//    * to force changes if the user has the app open already
//    */
//   useEffect(() => {
//     if (!user) return;
//     getKernels();
//     setStates();
//   }, []);

//   /**
//    * This happens when the global state changes
//    */
//   useEffect(() => {
//     setStates();
//   }, [s.kernel, JSON.stringify(s.kernels)]);

//   /**
//    * This is called when the user selects a kernel from the dropdown
//    * It updates the global state and the app description
//    * @param {React.ChangeEvent<HTMLSelectElement>} e
//    * @returns {void}
//    */
//   function selectKernel(e: React.ChangeEvent<HTMLSelectElement>): void {
//     if (e.target.value !== s.kernel) {
//       const name = e.currentTarget.selectedOptions[0].text.split(' ')[0];
//       if (name && name !== 'Select Kernel' && name !== 'Private') {
//         update(props._id, { title: `Seer> ${name}` });
//         updateState(props._id, { kernel: e.target.value });
//       } else {
//         update(props._id, { title: 'Seer> ' });
//         updateState(props._id, { kernel: '' });
//       }
//     }
//   }

//   /**
//    * Download the stickie as a text file
//    * @returns {void}
//    */
//   const downloadPy = (): void => {
//     // Current date
//     const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
//     const content = `${s.code}`;
//     // generate a URL containing the text of the note
//     const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
//     // Make a filename with username and date
//     const filename = 'seer-' + dt + '.py';
//     // Go for download
//     downloadFile(txturl, filename);
//   };

//   return (
//     <HStack>
//       <HelpModal isOpen={helpIsOpen} onClose={helpOnClose} />
//       {
//         <>
//           {/* check if there are kernels avaible. if none show offline, if available but no access show online with no kernels,
//            if available and access show online with kernels
//           */}
//           {s.kernels.length === 0 ? (
//             <Badge colorScheme="red" rounded="sm" size="lg">
//               Offline
//             </Badge>
//           ) : s.kernels.length > 0 && !selected ? (
//             <Badge colorScheme="yellow" rounded="sm" size="lg">
//               Online
//             </Badge>
//           ) : isPrivate ? (
//             ownerId === user?._id ? (
//               <Badge colorScheme="red" rounded="sm" size="lg">
//                 Locked
//               </Badge>
//             ) : (
//               <Badge colorScheme="red" rounded="sm" size="lg">
//                 Locked by {ownerName}
//               </Badge>
//             )
//           ) : (
//             <Badge colorScheme="green" rounded="sm" size="lg">
//               Ready
//             </Badge>
//           )}
//           <Select
//             placeholder={isPrivate ? 'Private' : 'Select Kernel'}
//             rounded="lg"
//             size="sm"
//             width="150px"
//             ml={2}
//             px={0}
//             colorScheme="teal"
//             icon={<MdArrowDropDown />}
//             onChange={(e) => selectKernel(e as React.ChangeEvent<HTMLSelectElement>)}
//             value={
//               // if the selected kernel is not the same as the global state, set the selected to the global state
//               // selected !== s.kernel ? s.kernel : selected
//               selected ?? undefined
//             }
//             variant={'outline'}
//             isDisabled={
//               // disable the dropdown there is a active kernel and the user does not have access
//               isPrivate && user && user._id !== ownerId ? true : false
//             }
//           >
//             {myKernels.map((el) => (
//               <option value={el.key} key={el.key}>
//                 {el.value.kernel_alias} (
//                 {
//                   // show kernel name as Python, R, or Julia
//                   el.value.kernel_name === 'python3' ? 'Python' : el.value.kernel_name === 'r' ? 'R' : 'Julia'
//                 }
//                 )
//               </option>
//             ))}
//           </Select>

//           <Tooltip placement="top-start" hasArrow={true} label={'Refresh Kernel List'} openDelay={400}>
//             <Button onClick={getKernels} _hover={{ opacity: 0.7 }} size="xs" mx="1" colorScheme="teal">
//               <MdRefresh />
//             </Button>
//           </Tooltip>

//           <Tooltip placement="top-start" hasArrow={true} label={'Click for help'} openDelay={400}>
//             <Button onClick={() => helpOnOpen()} _hover={{ opacity: 0.7 }} size="xs" mx="1" colorScheme="teal">
//               <MdHelp />
//             </Button>
//           </Tooltip>

//           <ButtonGroup isAttached size="xs" colorScheme="teal">
//             <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
//               <Button
//                 isDisabled={s.fontSize <= 8}
//                 onClick={() => updateState(props._id, { fontSize: Math.max(10, s.fontSize - 2) })}
//                 _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
//               >
//                 <MdRemove />
//               </Button>
//             </Tooltip>
//             <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
//               <Button
//                 isDisabled={s.fontSize > 42}
//                 onClick={() => updateState(props._id, { fontSize: Math.min(48, s.fontSize + 2) })}
//                 _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
//               >
//                 <MdAdd />
//               </Button>
//             </Tooltip>
//           </ButtonGroup>
//           <ButtonGroup isAttached size="xs" colorScheme="teal">
//             <Tooltip placement="top-start" hasArrow={true} label={'Download Code'} openDelay={400}>
//               <Button onClick={downloadPy} _hover={{ opacity: 0.7 }}>
//                 <MdFileDownload />
//               </Button>
//             </Tooltip>
//           </ButtonGroup>
//         </>
//       }
//     </HStack>
//   );
// }

export default { AppComponent, ToolbarComponent };

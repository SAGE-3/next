/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { truncateWithEllipsis, useAppStore, useHexColor, useUser } from '@sage3/frontend';
import {
  Badge,
  Box,
  ButtonGroup,
  HStack,
  IconButton,
  Spacer,
  Spinner,
  Stack,
  Textarea,
  Tooltip,
  useColorModeValue,
  useToast,
  useDisclosure,
  Code,
} from '@chakra-ui/react';
import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

// Styling
import './styles.css';
// import { MdClearAll, MdCode, MdCodeOff, MdHelp, MdHideSource, MdPlayArrow, MdStop } from 'react-icons/md';
import { MdClearAll, MdHelp, MdPlayArrow, MdStop } from 'react-icons/md';
import { useEffect, useState } from 'react';

import { v4 as getUUID } from 'uuid';

import { ToolbarComponent } from './components/toolbar';
import { HelpModal } from './components/help';
import { Outputs } from './components/outputs';
import { CodeEditor } from './components/editor';
import { KernelInfo } from '@sage3/shared/types';
// import { BiHide, BiShow } from 'react-icons/bi';

/**
 * Seer App
 */

/* App component for Seer */
function AppComponent(props: App): JSX.Element {
  // Make a toast to show errors
  const toast = useToast();
  const { user } = useUser();
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  // const update = useAppStore((state) => state.update);
  const [prompt, setPrompt] = useState<string>(s.prompt);
  const defaultPlaceHolderValue = 'Tell me what you want to do...';
  const [placeHolderValue, setPlaceHolderValue] = useState<string>(defaultPlaceHolderValue);
  const [myKernels, setMyKernels] = useState<KernelInfo[]>(s.kernels);
  const [access, setAccess] = useState<boolean>(false);
  const boardId = props.data.boardId;
  // Needed for Div resizing
  // const [editorHeight, setEditorHeight] = useState(150); // not beign used?
  // const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A');
  const accessDeniedColor = '#EE4B2B';
  const green = useHexColor('green');
  const [online, setOnline] = useState(false);
  const [kernel, setKernel] = useState<string>(s.kernel);

  /**
   * Populate the user's kernels and check if the user has access to the kernel
   */
  useEffect(() => {
    let kernelId = '';
    if (s.kernels) {
      const myKernels = s.kernels.reduce((kernels, kernel) => {
        if (kernel.board === boardId && (!kernel.is_private || (kernel.is_private && kernel.owner === user?._id))) {
          kernels.push(kernel);
        }
        return kernels;
      }, [] as KernelInfo[]);
      if (s.kernel) {
        const kernel = myKernels.find((kernel: KernelInfo) => kernel.kernel_id === s.kernel);
        setAccess(kernel ? true : false);
        kernelId = kernel ? kernel.kernel_id : 'restricted';
      }
      setKernel(kernelId);
    }
  }, [JSON.stringify(s.kernels), s.kernel]);

  useEffect(() => {
    setOnline(s.online);
  }, [s.online]);

  // const [isMarkdown, setIsMarkdown] = useState<boolean>(false);
  // const [showCode, setShowCode] = useState<boolean>(false);
  // const [showOutput, setShowOutput] = useState<boolean>(false);

  const SPACE = 2;
  // Help modal
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();
  // const accessDeniedColor = useColorModeValue('#EFDEDD', '#9C7979');

  // useEffect(() => {
  //   if (!s.output) return;
  //   // set the parsed output if execute_result or display_data is present
  //   const parsed = JSON.parse(s.output);
  //   parsed['display_data'] && parsed['display_data']['data'] && parsed['display_data']['data']['text/markdown']
  //     ? setShowCode(true)
  //     : setShowCode(false);
  //   console.log('markdown', isMarkdown);
  // }, [s.output]);

  // function getKernels() {
  //   if (!user) return;
  //   updateState(props._id, {
  //     executeInfo: {
  //       executeFunc: 'get_available_kernels',
  //       params: { _uuid: user._id },
  //     },
  //   });
  // }

  // Set the title on start
  // useEffect(() => {
  //   // update the title of the app
  //   if (props.data.title !== 'Seer') {
  //     update(props._id, { title: 'Seer' });
  //   }
  //   getKernels();
  // }, []);

  // useEffect(() => {
  //   // Get all kernels that I'm available to see
  //   const kernels: { value: Record<string, any>; key: string }[] = [];
  //   s.availableKernels.forEach((kernel) => {
  //     if (kernel.value.is_private) {
  //       if (kernel.value.owner_uuid == user?._id) {
  //         kernels.push(kernel);
  //       }
  //     } else {
  //       kernels.push(kernel);
  //     }
  //   });
  //   setMyKernels(kernels);
  // }, [JSON.stringify(s.availableKernels)]);

  // useEffect(() => {
  //   if (s.kernel == '') {
  //     setAccess(true); // need to check this...it's weird
  //   } else {
  //     const access = myKernels.find((kernel) => kernel.key === s.kernel);
  //     setAccess(access ? true : false);
  //     if (access) {
  //       const name = truncateWithEllipsis(access ? access.value.kernel_alias : s.kernel, 8);
  //       // update the title of the app
  //       update(props._id, { title: 'Seer: kernel [' + name + ']' });
  //     }
  //   }
  // }, [s.kernel, myKernels]);

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
            {/* <Tooltip label="Show/Hide Code" placement="top">
              <Badge variant="outline" colorScheme="red" onClick={() => setShowCode(!showCode)}>
                {showCode ? 'Show Code' : 'Hide Code'}
              </Badge>
            </Tooltip>
            <Tooltip label="Show/Hide Output" placement="top">
              <Badge variant="outline" colorScheme="red" onClick={() => setShowOutput(!showOutput)}>
                {showOutput ? 'Show Outputs' : 'Hide Outputs'}
              </Badge>
            </Tooltip> */}
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
                  fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
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
                      isDisabled={!s.kernel || s.executeInfo?.executeFunc !== 'generate'}
                      icon={<MdStop size={'1.5em'} color={useColorModeValue('#008080', '#008080')} />}
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
            hidden={false}
          >
            <CodeEditor app={props} access={access} editorHeight={150} online={online} />
          </Box>
          <Stack direction="row" hidden={false}>
            <Badge variant="outline" colorScheme="red" mb={-1}>
              Outputs
            </Badge>
            {/* <Tooltip label="Show/Hide Output" placement="top">
              <Badge variant="outline" colorScheme="red" onClick={() => setShowOutput(!showOutput)}>
                {showOutput ? 'Show Outputs' : 'Hide Outputs'}
              </Badge>
            </Tooltip> */}
            {/* <Badge variant="ghost" colorScheme="facebook" onClick={() => setShowOutput(!showOutput)}>
              {showOutput ? <BiShow aria-label="Show Output Editor" size="16px" /> : <BiHide aria-label="Hide Output" size="16px" />}
            </Badge> */}
          </Stack>
          <Box // output section container
            style={{
              backgroundColor: useColorModeValue('#FFFFFE', '#202020'),
              minHeight: '150px',
              border: '2px solid',
              borderColor: '#008080',
            }}
            hidden={false}
          >
            {!s.msgId ? <></> : <Outputs app={props} online={online} />}
          </Box>
        </Stack>
      </Box>
    </AppWindow>
  );
}

/* Grouped App toolbar component for the app Sensor Overview, this component will display when a group of apps are Lasso'ed are a Sensor Overview app. */

const GroupedToolbarComponent = (props: { apps: App[] }): JSX.Element => {
  return <></>;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

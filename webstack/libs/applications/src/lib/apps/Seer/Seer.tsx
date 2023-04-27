/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { truncateWithEllipsis, useAppStore, useUser } from '@sage3/frontend';
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
} from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styles.css';
import { MdClearAll, MdCode, MdCodeOff, MdHelp, MdHideSource, MdPlayArrow, MdStop } from 'react-icons/md';
import { useEffect, useState } from 'react';

import { v4 as getUUID } from 'uuid';

import { ToolbarComponent } from './components/toolbar';
import { HelpModal } from './components/help';
import { Outputs } from './components/outputs';
import { CodeEditor } from './components/editor';

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
  const update = useAppStore((state) => state.update);
  const [prompt, setPrompt] = useState<string>(s.prompt);
  const defaultPlaceHolderValue = 'Tell me what you want to do...';
  const [placeHolderValue, setPlaceHolderValue] = useState<string>(defaultPlaceHolderValue);
  const [myKernels, setMyKernels] = useState(s.availableKernels);
  const [access, setAccess] = useState<boolean>(false);
  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A');
  const boardId = props.data.boardId;
  const [isMarkdown, setIsMarkdown] = useState<boolean>(false);
  const SPACE = 2;
  // Help modal
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();
  // const accessDeniedColor = useColorModeValue('#EFDEDD', '#9C7979');

  useEffect(() => {
    if (!s.output) return;
    // set the parsed output if execute_result or display_data is present
    const parsed = JSON.parse(s.output);
    parsed['display_data'] && parsed['display_data']['data'] && parsed['display_data']['data']['text/markdown']
      ? setIsMarkdown(true)
      : setIsMarkdown(false);
    console.log('markdown', isMarkdown);
  }, [s.output]);

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
            <Badge // isTyping
              variant="ghost"
            >
              {s.isTyping ? 'Typing...' : ''}
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
          <Stack direction="row" hidden={isMarkdown}>
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
            hidden={isMarkdown}
          >
            {<CodeEditor app={props} access={access} />}
          </Box>
          <Stack direction="row">
            <Badge variant="outline" colorScheme="red">
              {isMarkdown ? 'Result' : 'Output Box'}
            </Badge>
            <Badge variant="outline" colorScheme="facebook" onClick={() => setIsMarkdown(!isMarkdown)}>
              {isMarkdown ? <MdCode aria-label="Show Code Editor" size="16px" /> : <MdCodeOff aria-label="Hide Code Editor" size="16px" />}

              {/* {isMarkdown ? `Show Code Editor` : 'Hide Code Editor'} */}
            </Badge>
          </Stack>
          <Box // output section container
            style={{
              backgroundColor: useColorModeValue('#FFFFFE', '#202020'),
              minHeight: '150px',
              border: '2px solid',
              borderColor: '#008080',
            }}
          >
            {!s.output ? <></> : <Outputs output={s.output} app={props} />}
          </Box>
        </Stack>
      </Box>
    </AppWindow>
  );
}

export default { AppComponent, ToolbarComponent };

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore, useKernelStore, useUser, useHexColor } from '@sage3/frontend';
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
  // useToast,
  useDisclosure,
  // Code,
} from '@chakra-ui/react';
import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

// import { KernelInfo, ContentItem } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

// Styling
import './styles.css';
// import { MdClearAll, MdCode, MdCodeOff, MdHelp, MdHideSource, MdPlayArrow, MdStop } from 'react-icons/md';
import { MdClearAll, MdHelp, MdPlayArrow, MdStop } from 'react-icons/md';
import { useEffect, useState } from 'react';

// import { v4 as getUUID } from 'uuid';

import { ToolbarComponent } from './components/toolbar';
import { HelpModal } from './components/help';
import { Outputs } from './components/outputs';
import { CodeEditor } from './components/editor';

/**
 * Seer App
 */

/* App component for Seer */
function AppComponent(props: App): JSX.Element {
  // Users
  const { user } = useUser();
  const userId = user?._id;

  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [prompt, setPrompt] = useState<string>(s.prompt);
  const defaultPlaceHolderValue = 'Tell me what you want to do...';
  const [placeHolderValue, setPlaceHolderValue] = useState<string>(defaultPlaceHolderValue);
  const [selectedKernelName, setSelectedKernelName] = useState<string>('');

  // Styles
  const green = useHexColor('green');
  const yellow = useHexColor('yellow');
  // const red = useHexColor('red');

  // Local state
  const [access, setAccess] = useState(true);

  // Kernel Store
  const { apiStatus, kernels, sendPrompt } = useKernelStore((state) => state);

  useEffect(() => {
    // If the API Status is down, set the publicKernels to empty array
    if (!apiStatus) {
      setAccess(false);
      return;
    } else {
      const selectedKernel = kernels.find((kernel: { kernel_id: string }) => kernel.kernel_id === s.kernel);
      setSelectedKernelName(selectedKernel ? selectedKernel.alias : '');
      const isPrivate = selectedKernel?.is_private;
      const owner = selectedKernel?.owner;
      if (!isPrivate) setAccess(true);
      else if (isPrivate && owner === userId) setAccess(true);
      else setAccess(false);
    }
  }, [access, apiStatus, kernels, s.kernel]);

  const handleGenerate = async () => {
    const canExec = SAGE3Ability.canCurrentUser('execute', 'kernels');
    if (!user || !apiStatus || !access || !canExec) return;
    if (prompt) {
      try {
        const response = await sendPrompt(prompt, s.kernel, user?._id);
        if (response.ok) {
          console.log('Response', response);
          // const data = await response.json();
          // updateState(props._id, {
          //  code: data.code,
          //  prompt: data.prompt,
          //  streaming: data.streaming,
          //  kernel: data.kernel,
          // }
        } else {
          console.log('Error generating code');
        }
      } catch (error) {
        if (error instanceof TypeError) {
          console.log(`The Jupyter proxy server appears to be offline. (${error.message})`);
          updateState(props._id, {
            streaming: false,
            prompt: '',
            kernel: '',
            kernels: [],
            history: [],
            msgId: '',
          });
        }
      }
    }
  };

  // const [isMarkdown, setIsMarkdown] = useState<boolean>(false);
  // const [showCode, setShowCode] = useState<boolean>(false);
  // const [showOutput, setShowOutput] = useState<boolean>(false);

  const SPACE = 2;
  // Help modal
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();

  const handleUpdatePrompt = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  useEffect(() => {
    if (s.prompt !== prompt) {
      setPrompt(s.prompt);
    }
  }, [s.prompt]);

  // handle interrupt
  const handleInterrupt = () => {
    console.log('Interrupting...');
    updateState(props._id, { streaming: false });
  };
  const handleClear = () => {
    updateState(props._id, {
      prompt: '',
      output: '',
      streaming: false,
      msgId: '',
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
            <Badge variant="ghost" color={selectedKernelName ? green : yellow} textOverflow={'ellipsis'} width="200px">
              {selectedKernelName ? `Kernel: ${selectedKernelName}` : 'No Kernel Selected'}
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
                    handleGenerate();
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
                      onClick={handleGenerate}
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
            <CodeEditor app={props} access={access} editorHeight={150} online={apiStatus} />
          </Box>
          <Stack direction="row" hidden={false}>
            <Badge variant="outline" colorScheme="red" mb={-1}>
              Outputs
            </Badge>
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
            {!s.msgId ? <></> : <Outputs app={props} online={apiStatus} />}
          </Box>
        </Stack>
      </Box>
    </AppWindow>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

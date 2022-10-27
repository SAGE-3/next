/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import {
  Box,
  Input,
  InputGroup,
  Select,
  Text,
  Tooltip,
  Flex,
  IconButton,
  HStack,
  Checkbox,
  VStack,
  Button,
  ButtonGroup,
  Spacer,
  Divider,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';

import { MdAdd, MdRefresh, MdRestartAlt, MdCode, MdDelete, MdVisibility, MdVisibilityOff } from 'react-icons/md';

// import { GiSpy, GiPublicSpeaker } from 'react-icons/gi';

import { truncateWithEllipsis, useHexColor, useAppStore, useUser } from '@sage3/frontend';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

/* App component for KernelDashboard */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  const [isPrivate, setIsPrivate] = useState(false);
  // User
  const { user } = useUser();
  // Room and Board info used to create kernels
  const { boardId, roomId } = useParams<{ boardId: string; roomId: string }>();
  const [kernelAlias, setKernelAlias] = useState<string>('');
  const [kernelName, setKernelName] = useState<string>('python3');
  const [myKernels, setMyKernels] = useState(s.availableKernels);
  // Theme
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

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

  /**
   *
   * Add a kernel to the list of kernels by sending a request to the backend
   * and updating the state. Defaults to python3 kernel. Expects a kernel alias
   * and a kernel name.
   *
   * @returns  void
   */
  const addKernel = () => {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'add_kernel',
        params: {
          kernel_alias: kernelAlias,
          kernel_name: kernelName,
          room_uuid: roomId,
          board_uuid: boardId,
          owner_uuid: user._id,
          is_private: isPrivate,
        },
      },
    });
    setKernelAlias('');
    setIsPrivate(false);
  };

  // Triggered on every keystroke
  function changeAlias(e: React.ChangeEvent<HTMLInputElement>) {
    const cleanAlias = e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '');
    setKernelAlias(cleanAlias);
  }

  // // Triggered on 'enter' key
  // function submitAlias(e: React.FormEvent) {
  //   e.preventDefault();
  //   e.stopPropagation();
  // }

  /**
   * Remove the kernel if the user confirms the action
   * @param kernelId the id of the kernel to remove
   *
   * @returns void
   */
  const removeKernel = (kernelId: string) => {
    if (!user || !kernelId) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'delete_kernel',
        params: {
          kernel_id: kernelId,
          user_uuid: user._id,
        },
      },
    });
  };

  /**
   * Restart the kernel
   * @param kernelId the id of the kernel to restart
   *
   * @returns void
   */
  const restartKernel = (kernelId: string) => {
    if (!user || !kernelId) return;
    updateState(props._id, { executeInfo: { executeFunc: 'restart_kernel', params: { kernel_id: kernelId, user_uuid: user._id } } });
  };

  /**
   * Open SageCell using the kernel
   * @param kernelId the id of the kernel to restart
   *
   * @returns void
   */
  const startSageCell = (kernelId: string, kernelAlias: string) => {
    if (!user || !roomId || !boardId) return;
    createApp({
      name: 'SageCell',
      description: `SageCell> ${kernelAlias}`,
      roomId: roomId,
      boardId: boardId,
      position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
      size: { width: 600, height: props.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'SageCell',
      state: {
        code: '',
        language: 'python',
        fontSize: 24,
        theme: 'xcode',
        kernel: kernelId,
        availableKernels: [],
        privateMessage: [],
        output: '',
        executeInfo: { executeFunc: '', params: {} },
      },
      ownerId: user._id,
      minimized: false,
      raised: true,
    });
  };

  return (
    <AppWindow app={props}>
      <VStack w={'100%'} h={'100%'}>
        {/* FIXED POSITION TOP FORM */}
        <HStack w={'100%'} px={5} py={2} borderBottom={'2px'} borderColor={'gray.200'} bg={useColorModeValue('#F1F1F1', '#111')} zIndex={1}>
          <InputGroup>
            <Box w={'100%'} pr={2}>
              <Select
                size="md"
                colorScheme="teal"
                value={kernelName}
                placeholder="Select kernel"
                onChange={(e) => {
                  setKernelName(e.target.value);
                }}
              >
                {s.kernelSpecs.length > 0 &&
                  Object.keys(JSON.parse(JSON.stringify(s.kernelSpecs[0])).kernelspecs).map((k) => (
                    <option key={k} value={k}>
                      {
                        // show R for ir, Python for python3, etc.}
                        k === 'ir' ? 'R' : k === 'python3' ? 'Python' : k === 'julia-1.8' ? 'Julia' : k
                      }
                    </option>
                  ))}
              </Select>
            </Box>
            <Spacer />
            <Box w={'100%'} px={2}>
              <Input
                placeholder="Enter kernel alias..."
                variant="outline"
                size="md"
                px={4}
                _placeholder={{ opacity: 1, color: 'gray.400' }}
                value={kernelAlias}
                onChange={changeAlias}
                onPaste={(event) => {
                  event.stopPropagation();
                }}
              />
            </Box>
            <Box px={2} display="flex" alignItems="center">
              <Checkbox size={'lg'} isChecked={isPrivate} onChange={() => setIsPrivate(!isPrivate)}>
                Private
              </Checkbox>
            </Box>

            <Tooltip label="Add a new kernel" aria-label="Add a new kernel" placement="top" fontSize="md" hasArrow>
              <IconButton
                variant="outline"
                size="md"
                aria-label="Add Kernel"
                onClick={addKernel}
                colorScheme="teal"
                icon={<MdAdd size="24px" />}
              />
            </Tooltip>
          </InputGroup>
        </HStack>

        {/* SCROLL BOX LOWER */}
        <Box
          w={'100%'}
          p={2}
          pt={0}
          id="lower-div"
          overflowY={'auto'}
          css={{
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              width: '12px',
              background: useColorModeValue('#FFF', '#000'),
              borderRadius: '5px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: gripColor,
              borderRadius: '24px',
            },
          }}
        >
          <VStack w={'100%'} p={2} spacing={2}>
            <Flex w="100%" fontFamily="mono" alignItems="center" userSelect={'none'}>
              <Box flex=".2" pr={1}>
                {/* Kernel */}
              </Box>
              <Box flex="1" pr={4}>
                Kernel
              </Box>
              <Box flex="1" pr={4}>
                Alias
              </Box>
              <Box flex="1" pr={4}>
                Type
              </Box>
              <Box flex="1" pr={4}>
                Actions
              </Box>
            </Flex>
            <Divider mb={1} />
          </VStack>

          {
            // If there are kernels, display them
            myKernels.map((kernel) => (
              <VStack w={'100%'} p={2} spacing={2}>
                <Flex w="100%" fontFamily="mono" alignItems="center" userSelect={'none'}>
                  <Box flex=".2" pr={1}>
                    {kernel.value.is_private ? (
                      <Icon as={MdVisibilityOff} color={'red.500'} />
                    ) : (
                      <Icon as={MdVisibility} color="green.500" />
                    )}
                  </Box>
                  <Box flex="1" pr={4}>
                    <Text
                      onClick={() => {
                        navigator.clipboard.writeText(kernel.value.kernel_alias);
                      }}
                      fontSize="md"
                      fontWeight="bold"
                    >
                      {kernel.value.kernel_alias}
                    </Text>
                  </Box>
                  <Box flex="1" pr={4}>
                    <Text
                      onClick={() => {
                        navigator.clipboard.writeText(kernel.key);
                      }}
                      ml={2}
                      fontWeight="bold"
                    >
                      <Tooltip label={kernel.key} placement="top" fontSize="xs" hasArrow>
                        {truncateWithEllipsis(kernel.key, 8)}
                      </Tooltip>
                    </Text>
                  </Box>
                  <Box flex="1" pr={4}>
                    <Text>
                      {
                        // show R for ir, Python for python3, etc.}
                        kernel.value.kernel_name === 'ir'
                          ? 'R'
                          : kernel.value.kernel_name === 'python3'
                          ? 'Python'
                          : kernel.value.kernel_name === 'julia-1.8'
                          ? 'Julia'
                          : kernel.value.kernel_name
                      }
                    </Text>
                  </Box>
                  <Box flex="1" pr={4}>
                    <Flex alignItems="right">
                      <Tooltip label={'Open a SageCell'} placement="top" fontSize="md" hasArrow>
                        <IconButton
                          variant="outline"
                          size="md"
                          onClick={() => {
                            startSageCell(kernel.key, kernel.value.kernel_alias);
                          }}
                          colorScheme="teal"
                          aria-label="Delete Kernel"
                          icon={<MdCode size="24px" />}
                        />
                      </Tooltip>
                      <Tooltip label={'Restart Kernel'} placement="top" fontSize="md" hasArrow>
                        <IconButton
                          mx={2} // this provides spacing between the buttons
                          variant="outline"
                          size="md"
                          onClick={() => {
                            restartKernel(kernel.key);
                          }}
                          colorScheme="teal"
                          aria-label="Restart Kernel"
                          icon={<MdRestartAlt size="24px" />}
                        />
                      </Tooltip>
                      <Tooltip label="Delete kernel" aria-label="Delete kernel" placement="top" fontSize="md" hasArrow>
                        <IconButton
                          variant="outline"
                          size="md"
                          aria-label="Delete Kernel"
                          onClick={() => {
                            removeKernel(kernel.key);
                          }}
                          colorScheme="red"
                          icon={<MdDelete size="24px" />}
                        />
                      </Tooltip>
                    </Flex>
                  </Box>
                </Flex>
              </VStack>
            ))
          }
        </Box>
      </VStack>
    </AppWindow>
  );
}

/* App toolbar component for the app KernelDashboard */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();

  return (
    <HStack>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Refresh List of Kernels'} openDelay={400}>
          <Button
            onClick={() =>
              updateState(props._id, {
                executeInfo: {
                  executeFunc: 'get_available_kernels',
                  params: { user_uuid: user?._id },
                },
              })
            }
            _hover={{ opacity: 0.7 }}
          >
            <MdRefresh />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </HStack>
  );
}

export default { AppComponent, ToolbarComponent };

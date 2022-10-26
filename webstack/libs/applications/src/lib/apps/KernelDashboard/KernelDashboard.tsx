/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import {
  useColorModeValue,
  Box,
  Input,
  InputGroup,
  Select,
  Text,
  Tooltip,
  Stack,
  Flex,
  IconButton,
  HStack,
  Checkbox,
  VStack,
  Button,
  ButtonGroup,
} from '@chakra-ui/react';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';
import { truncateWithEllipsis, useAppStore, useUser } from '@sage3/frontend';
import { useState, useEffect } from 'react';
import { MdRemove, MdAdd, MdRefresh, MdRestartAlt, MdCode, MdContentCopy, MdError } from 'react-icons/md';
import { useParams } from 'react-router-dom';

/* App component for KernelDashboard */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  const [isPrivate, setIsPrivate] = useState(false);
  const { user } = useUser();
  const { boardId, roomId } = useParams<{ boardId: string; roomId: string }>();
  const [kernelAlias, setKernelAlias] = useState<string>('');
  const [kernelName, setKernelName] = useState<string>('python3');
  const [myKernels, setMyKernels] = useState(s.availableKernels);

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

  // useEffect(() => {
  //   setMyKernels(s.availableKernels);
  // }, [s.availableKernels]);

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

  // Triggered on 'enter' key
  function submitAlias(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

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
      <Box p={4} w={'100%'} h={'100%'} bg={useColorModeValue('#E8E8E8', '#1A1A1A')}>
        <VStack w={'100%'} h={'100%'}>
          {/* FIXED POSITION TOP */}
          <HStack
            w={'100%'}
            p={5}
            style={{
              border: '2px solid #111',
              borderRadius: '2px',
            }}
          >
            <Box w="100%">
              <Select
                size="md"
                colorScheme="teal"
                value={kernelName}
                placeholder="Select kernel"
                backgroundColor="whiteAlpha.300"
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
            <Box w="100%">
              <form onSubmit={submitAlias}>
                <InputGroup>
                  <Input
                    placeholder="Enter kernel alias..."
                    variant="outline"
                    size="md"
                    _placeholder={{ opacity: 1, color: 'gray.600' }}
                    value={kernelAlias}
                    onChange={changeAlias}
                    onPaste={(event) => {
                      event.stopPropagation();
                    }}
                    backgroundColor="whiteAlpha.300"
                    padding={'0 4px 0 4px'}
                  />
                </InputGroup>
              </form>
            </Box>
            <Checkbox size={'md'} isChecked={isPrivate} onChange={() => setIsPrivate(!isPrivate)}>
              Private
            </Checkbox>
            <Tooltip
              label="Add a new kernel"
              aria-label="Add a new kernel"
              placement="top"
              fontSize="md"
              hasArrow
              style={{ border: '2px solid #111', borderRadius: '2px' }}
            >
              <IconButton
                variant="outline"
                m={0.5}
                size="md"
                aria-label="Add Kernel"
                onClick={addKernel}
                colorScheme="teal"
                icon={<MdAdd />}
              />
            </Tooltip>{' '}
          </HStack>

          {/* SCROLL BOX LOWER */}
          <Box
            w={'100%'}
            p={2}
            id="lower-div"
            bg={useColorModeValue('#E8E8E8', '#1A1A1A')}
            overflowY={'auto'}
            style={{ border: '2px solid #111', borderRadius: '2px' }}
          >
            {
              // If there are kernels, display them
              myKernels.map((kernel) => (
                <Box key={kernel.key} p={2} bg={useColorModeValue('#E8E8E8', '#1A1A1A')}>
                  <Flex p={1} bg="cardHeaderBg" align="left" justify="space-between" shadow="sm" cursor="pointer">
                    <Tooltip
                      label={
                        <Stack>
                          <Text>Kernel Alias: {kernel.value.kernel_alias}</Text>
                          <HStack>
                            <MdContentCopy aria-label={kernel.value.kernel_alias} />
                            <Text>Click to Copy</Text>
                          </HStack>
                        </Stack>
                      }
                      placement="top"
                    >
                      <Text
                        onClick={() => {
                          navigator.clipboard.writeText(kernel.value.kernel_alias);
                        }}
                        fontSize="md"
                        fontWeight="bold"
                      >
                        {kernel.value.kernel_alias}
                      </Text>
                    </Tooltip>
                    <Text
                      onClick={() => {
                        navigator.clipboard.writeText(kernel.key);
                      }}
                      ml={2}
                      fontWeight="bold"
                    >
                      <Tooltip
                        label={
                          <Stack>
                            <Text>Kernel Id: {kernel.key}</Text>
                            <HStack>
                              <MdContentCopy aria-label={kernel.key} />
                              <Text>Click to Copy</Text>
                            </HStack>
                          </Stack>
                        }
                        placement="top"
                      >
                        {truncateWithEllipsis(kernel.key, 8)}
                      </Tooltip>
                    </Text>
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
                    <Flex alignItems="right">
                      <Tooltip label={'Open a SageCell'} placement="top">
                        <IconButton
                          variant="outline"
                          m={0.5}
                          size="md"
                          onClick={() => {
                            startSageCell(kernel.key, kernel.value.kernel_alias);
                          }}
                          colorScheme="teal"
                          aria-label="Delete Kernel"
                          icon={<MdCode />}
                        />
                      </Tooltip>
                      <Tooltip label={'Remove Kernel'} placement="top">
                        <IconButton
                          variant="outline"
                          m={0.5}
                          size="md"
                          onClick={() => {
                            removeKernel(kernel.key);
                          }}
                          colorScheme="teal"
                          aria-label="Delete Kernel"
                          icon={<MdRemove />}
                        />
                      </Tooltip>
                      <Tooltip label={'Restart Kernel'} placement="top">
                        <IconButton
                          variant="outline"
                          m={0.5}
                          size="md"
                          onClick={() => {
                            restartKernel(kernel.key);
                          }}
                          colorScheme="teal"
                          aria-label="Restart Kernel"
                          icon={<MdRestartAlt />}
                        />
                      </Tooltip>
                    </Flex>
                  </Flex>
                </Box>
              ))
            }
          </Box>
        </VStack>
      </Box>
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

export const KernelDashboard = {
  AppComponent,
  ToolbarComponent,
};

export default { AppComponent, ToolbarComponent };

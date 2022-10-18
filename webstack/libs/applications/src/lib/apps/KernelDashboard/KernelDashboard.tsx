/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import {
  useColorModeValue, Box, Input, InputGroup, Select, Text, Tooltip,
  Stack, Collapse, Flex, Icon, IconButton, HStack, Badge, useDisclosure, Modal, Checkbox, Button, InputRightElement, VStack,
} from '@chakra-ui/react';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';
import { useAppStore, GetConfiguration, useUser, truncateWithEllipsis } from '@sage3/frontend';
import { useState, useEffect } from 'react';
import { MdRemove, MdAdd, MdRefresh, MdRestartAlt, MdCode } from 'react-icons/md';
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


  useEffect(() => {
    updateState(props._id, { executeInfo: { executeFunc: 'get_kernel_specs', params: {} } });
  }, [props._id, updateState]);




  const updateStates = () => {
    getKernelSpecs();
    getAvailableKernels();
  }

  const getKernelSpecs = () => {
    updateState(props._id, { executeInfo: { executeFunc: 'get_kernel_specs', params: {} } });
  };

  const getAvailableKernels = () => {
    if (!user) return;
    updateState(props._id, { executeInfo: { executeFunc: 'get_available_kernels', params: { user_uuid: user._id } } });
  };


  /**
   * Update the kernels list by fetching the kernels from the backend
   * and updating the state
   */
  const refresh = () => {
    updateState(props._id, { executeInfo: { executeFunc: 'refresh_list', params: {} } });
  };

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
    console.log("the clean alias is")
    console.log(kernelAlias)
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
          // owner_uuid: user._id
        },
      },
    });
  };

  /**
   * Start the kernel
   * @param kernelId the id of the kernel to start
   *
   * @returns void
   */
  const startKernel = (kernelId: string) => {
    updateState(props._id, { executeInfo: { executeFunc: 'start_kernel', params: { kernel_id: kernelId } } });
  };

  /**
   * Stop the kernel
   * @param kernelId the id of the kernel to stop
   *
   * @returns void
   */
  const stopKernel = (kernelId: string) => {
    updateState(props._id, { executeInfo: { executeFunc: 'stop_kernel', params: { kernel_id: kernelId } } });
  };

  /**
   * Restart the kernel
   * @param kernelId the id of the kernel to restart
   *
   * @returns void
   */
  const restartKernel = (kernelId: string) => {
    updateState(props._id, { executeInfo: { executeFunc: 'restart_kernel', params: { kernel_id: kernelId } } });
  };

  /**
   * Open SageCell using the kernel
   * @param kernelId the id of the kernel to restart
   *
   * @returns void
   */
  const startSageCell = (kernelId: string) => {
    // convert s.kernels to a list of kernel objects with the kernel_id as the key and the kernel name as the value
    // const kernelList = s.kernels ? s.kernels.map((k) => ({ [k.id]: k.name })) : [];
    if (!user) return;
    createApp({
      name: 'SageCell',
      description: `SageCell> ${kernelId}`,
      roomId: roomId!,
      boardId: boardId!,
      position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
      size: { width: 600, height: props.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'SageCell',
      state: {
        code: '',
        language: 'python',
        fontSize: 1.5,
        theme: 'xcode',
        kernel: kernelId,
        kernels: s.kernels,
        sessions: s.sessions,
        availableKernels: [],
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
      <Box p={4} w={'100%'} h={'100%'} bg={useColorModeValue('#E8E8E8', '#1A1A1A')} onFocus={updateStates}>
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
                onClick={() => addKernel()}
                colorScheme="teal"
                icon={<MdAdd />}
              />
            </Tooltip>
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
            <Box w="100%">
              <Select
                variant="outline"
                size="md"
                colorScheme="teal"
                value={kernelName}
                placeholder="Select kernel"
                onChange={(e) => {
                  setKernelName(e.target.value);
                }}
              >
                {
                  /**
                   * Gets the list of kernel options from the state via API call
                   * and map them to a list of <option> elements for the <select>
                   */
                  s.kernelSpecs.length > 0 &&
                    Object.keys(JSON.parse(JSON.stringify(s.kernelSpecs[0])).kernelspecs).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))
                }
              </Select>
            </Box>
            <Checkbox size={'md'} isChecked={isPrivate} onChange={() => setIsPrivate(!isPrivate)}>
              Private
            </Checkbox>
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
              // sort kernels by last_activity (most recent first)
              s.kernels
                .sort((a, b) => (a.last_activity < b.last_activity ? 1 : -1))
                .map((kernel) => (
                  <Box key={kernel.id} p={2} bg={useColorModeValue('#E8E8E8', '#1A1A1A')}>
                    <Flex p={1} bg="cardHeaderBg" align="left" justify="space-between" shadow="sm" cursor="pointer">
                      <Text
                        onClick={() => {
                          startSageCell(kernel.id);
                        }}
                        ml={2}
                        fontWeight="bold"
                      >
                        <Tooltip label={kernel.id} placement="top">
                          {truncateWithEllipsis(kernel.id, 8)}
                        </Tooltip>
                      </Text>{' '}
                      <Text>{kernel.name}</Text>
                      <Flex alignItems="right">
                        <Tooltip label={'Open a SageCell'} placement="top">
                          <IconButton
                            variant="outline"
                            m={0.5}
                            size="md"
                            onClick={() => {
                              startSageCell(kernel.id);
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
                              removeKernel(kernel.id);
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
                              restartKernel(kernel.id);
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


  return (
    <Box>
    </Box>
  );
}

export const KernelDashboard = {
  AppComponent,
  ToolbarComponent,
};


export default { AppComponent, ToolbarComponent };

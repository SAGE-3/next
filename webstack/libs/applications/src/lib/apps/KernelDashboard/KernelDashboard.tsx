/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import {
  useColorModeValue, Box, Input, InputGroup, Select, Text, Tooltip,
  IconButton, HStack, Checkbox, VStack, Button,
} from '@chakra-ui/react';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { Kernel, KernelSpec, state as AppState } from './index';
import { useAppStore, useUser } from '@sage3/frontend';
import { useState, useEffect } from 'react';
import { MdAdd, MdRestartAlt, MdCode, MdPlayArrow, MdDelete, MdStop, MdRefresh } from 'react-icons/md';
import { useLocation } from 'react-router-dom';

/* App component for KernelDashboard */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  const [isPrivate, setIsPrivate] = useState(false);
  const { user } = useUser();
  const location = useLocation();
  const locationState = location.state as { boardId: string; roomId: string };
  const [kernelAlias, setKernelAlias] = useState<string>('');
  const [kernelName, setKernelName] = useState<string>('python3');
  const [availableKernels, setAvailableKernels] = useState(s.availableKernels);

  useEffect(() => {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'start',
        params: { room_uuid: locationState.roomId, board_uuid: locationState.boardId, user_uuid: user._id },
      },
    });
    getAvailableKernels();
  }, [user]);

  const getAvailableKernels = () => {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'get_available_kernels',
        params: { room_uuid: locationState.roomId, board_uuid: locationState.boardId, user_uuid: user._id },
      },
    });
    // if s.availableKernels is not empty, then set it to availableKernels
    if (s.availableKernels.length > 0) {
      setAvailableKernels(s.availableKernels);
      updateState(props._id, { availableKernels: [] });
    }
  };

  useEffect(() => {
    if (s.availableKernels.length > 0) {
      setAvailableKernels(s.availableKernels);
      updateState(props._id, { availableKernels: [] });
    }
  }, [s.availableKernels]);



  /**
   * Update the kernels list by fetching the kernels from the backend
   * and updating the state
   */
  const refresh = () => {
    updateState(props._id, { executeInfo: { executeFunc: 'refresh_list', params: {} } });
  };

  // kernel_alias, room_uuid, board_uuid, owner_uuid, is_private, (kernel_name = 'python3');
  /**
   * room_uuid, board_uuid, owner_uuid, is_private=False,
   * kernel_name="python3", auth_users=(), kernel_alias="YO"
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
          room_uuid: locationState.roomId,
          board_uuid: locationState.boardId,
          owner_uuid: user._id,
          is_private: isPrivate,
          kernel_alias: kernelAlias,
          kernel_name: kernelName,
          auth_users: (user._id),
        },
      },
    });
    if (kernelAlias !== '') {
      setKernelAlias('');
    }
    if (isPrivate) {
      setIsPrivate(false);
    }
  };

  // Triggered on every keystroke
  function changeAlias(e: React.ChangeEvent<HTMLInputElement>) {
    const cleanAlias = e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '');
    setKernelAlias(cleanAlias);
    // console.log("the clean alias is")
    // console.log(kernelAlias)
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
  const deleteKernel = (kernelId: string) => {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'delete_kernel',
        params: {
          kernel_id: kernelId,
          // owner_uuid: user._id // TODO: check if this is needed
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
    if (!user) return;
    createApp({
      name: 'SageCell',
      description: `SageCell> ${kernelId}`,
      roomId: locationState.roomId,
      boardId: locationState.boardId,
      position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
      size: { width: 600, height: props.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'SageCell',
      state: {
        code: '',
        output: '',
        language: 'python',
        fontSize: 1.5,
        theme: 'xcode',
        kernel: kernelId,
        availableKernels: s.availableKernels,
        executeInfo: { executeFunc: '', params: {} },
      },
      ownerId: user._id,
      minimized: false,
      raised: true,
    });
  };

  return (
    <AppWindow app={props}>
      <Box
        w={'100%'}
        h={'100%'}
        bg={useColorModeValue('#FFF', '#000')}
        onFocus={getAvailableKernels}
      >
        <VStack
          w={'100%'}
          h={'100%'}
          // backgroundColor="whiteAlpha.300"
          spacing={0}
        >
          {/* FIXED POSITION TOP */}
          <HStack w={'100%'} p={4} spacing={4} bg={useColorModeValue('#E8E8E8', '#1A1A1A')} borderBottom="1px solid teal">
            <Tooltip label="Add a new kernel" aria-label="Add a new kernel" placement="top" fontSize="md" hasArrow>
              <IconButton
                // variant="outline"
                size="md"
                aria-label="Add Kernel"
                onClick={addKernel}
                colorScheme="teal"
                rounded="full"
                border="2px solid teal"
                icon={<MdAdd size="25px" />}
              />
            </Tooltip>
            <Box w="100%">
              <Select
                // variant="outline"
                size="md"
                colorScheme="teal"
                value={kernelName}
                placeholder="Select kernel"
                backgroundColor="whiteAlpha.300"
                onChange={(e) => {
                  setKernelName(e.target.value);
                }}
              >
                {
                  s.kernelSpecs.length > 0 &&
                    Object.keys(JSON.parse(JSON.stringify(s.kernelSpecs[0])).kernelspecs).map((k) => (
                      <option key={k} value={k}>
                        {// show R for ir, Python for python3, etc.}
                        k === 'ir' ? 'R' : k === 'python3' ? 'Python' : k === 'julia-1.8' ? 'Julia' : k}
                      </option>
                    ))
                }
              </Select>
            </Box>
            <Box w="100%">
              <form onSubmit={submitAlias}>
                <InputGroup>
                  <Input
                    placeholder="Enter kernel alias..."
                    size="md"
                    _placeholder={{
                      textOverflow: 'ellipsis !important',
                      theme: 'teal',
                      color: 'teal.500',
                      fontSize: 'md',
                      fontWeight: 'bold',
                      opacity: 1,
                    }}
                    value={kernelAlias}
                    onChange={changeAlias}
                    onPaste={(event) => {
                      event.stopPropagation();
                    }}
                    backgroundColor="whiteAlpha.300"
                  />
                </InputGroup>
              </form>
            </Box>
            <Checkbox size={'md'} isChecked={isPrivate} onChange={() => setIsPrivate(!isPrivate)}>
              Private
            </Checkbox>
          </HStack>
          {/* SCROLL BOX LOWER */}
          <Box
            w={'100%'}
            // id="lower-div"
            bg={useColorModeValue('#E8E8E8', '#1A1A1A')}
            // bg={useColorModeValue('#f1f1f1', '#1A1A1A')}
            overflowY={'scroll'}
            overflowX={'hidden'}
            css={{
              // scrollbarWidth: 'thin',
              scrollbarColor: 'teal  #f1f1f1',
              '&::-webkit-scrollbar': {
                width: '6px',
                height: '6px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'teal',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'teal',
                borderRadius: '24px',
              },
              '&::-webkit-scrollbar-corner': {
                backgroundColor: 'teal',
              },
            }}
            // style={{ border: '0px solid #111', borderRadius: '2px' }}
          >
            <VStack w={'100%'} spacing={0}>
              {
                // If there are kernels, display them
                s.kernels
                  // sort kernels by last_activity (most recent first)
                  .sort((a, b) => (a.last_activity < b.last_activity ? 1 : -1))
                  .map((kernel) =>
                    // find only the kernels that are in the list of available kernels
                    availableKernels.map(
                      ({ value, label }) =>
                        value === kernel.id && (
                          // if the kernel is in the list of available kernels, display the label
                          <HStack
                            key={kernel.id}
                            w={'100%'}
                            p={4}
                            style={{
                              border: '2px solid #111',
                              borderRadius: '6px',
                              background: useColorModeValue('#FFF', '#1A1A1A'),
                            }}
                          >
                            <Tooltip
                              label="Start SageCell"
                              aria-label="Start SageCell"
                              placement="top"
                              fontSize="md"
                              hasArrow
                              style={{ border: '1px solid #111', borderRadius: '2px' }}
                            >
                              <IconButton
                                variant="outline"
                                size="md"
                                rounded="full"
                                border="2px solid teal"
                                aria-label="Start SageCell"
                                onClick={() => startSageCell(kernel.id)}
                                colorScheme="teal"
                                icon={<MdPlayArrow size="25px" />}
                              />
                            </Tooltip>
                            <Box w="100%">
                              <Tooltip label={kernel.id} placement="top">
                                <Text fontSize="md" fontWeight="bold">
                                  {label}
                                </Text>
                              </Tooltip>
                            </Box>
                            <Box w="100%">
                              <Text fontSize="md" color="gray.500">
                                {{ python3: 'Python3', ir: 'R', 'julia-1.8': 'Julia' }[kernel.name]}
                              </Text>
                            </Box>
                            <Box w="100%">
                              <Tooltip
                                label={kernel.last_activity ? new Date(kernel.last_activity).toLocaleString() : 'Never'}
                                placement="top"
                              >
                                <Text fontSize="md" color="gray.500">
                                  {
                                    // show time since last activity if it exists
                                    kernel.last_activity ? new Date(kernel.last_activity).toLocaleString().split(',')[1] : 'Never'
                                  }
                                </Text>
                              </Tooltip>
                            </Box>
                            <Tooltip
                              label="Delete kernel"
                              aria-label="Delete kernel"
                              placement="top"
                              fontSize="md"
                              hasArrow
                              style={{ border: '1px solid #111', borderRadius: '2px' }}
                            >
                              <IconButton
                                variant="outline"
                                size="md"
                                rounded="full"
                                border="2px solid teal"
                                aria-label="Delete Kernel"
                                onClick={() => deleteKernel(kernel.id)}
                                colorScheme="teal"
                                icon={<MdDelete size="25px" />}
                              />
                            </Tooltip>
                            <Tooltip
                              label={'Stop Kernel'}
                              aria-label={'Stop Kernel'}
                              placement="top"
                              fontSize="md"
                              hasArrow
                              style={{ border: '1px solid #111', borderRadius: '2px' }}
                            >
                              <IconButton
                                variant="outline"
                                size="md"
                                rounded="full"
                                border="2px solid teal"
                                aria-label="Stop Kernel"
                                onClick={() => stopKernel(kernel.id)}
                                colorScheme="teal"
                                icon={<MdStop size="25px" />}
                              />
                            </Tooltip>
                            <Tooltip label={'Restart Kernel'} placement="top">
                              <IconButton
                                variant="outline"
                                size="md"
                                rounded="full"
                                border="2px solid teal"
                                onClick={() => {
                                  restartKernel(kernel.id);
                                }}
                                colorScheme="teal"
                                aria-label="Restart Kernel"
                                icon={<MdRestartAlt size="25px" />}
                              />
                            </Tooltip>
                          </HStack>
                        )
                    )
                  )
              }
            </VStack>
          </Box>
        </VStack>
      </Box>
    </AppWindow>
  );
};

/* App toolbar component for the app KernelDashboard */

function ToolbarComponent(props: App): JSX.Element {

  // const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  
  const { user } = useUser();

  return (
    <Box
      w={'100%'}
      h={'100%'}
      display={'flex'}
      flexDirection={'row'}
      justifyContent={'space-between'}
      alignItems={'center'}
      p={2}
    >
      <Box display={'flex'} flexDirection={'row'} alignItems={'center'}>
        <Button variant="ghost" size='lg'>
          <MdRefresh />
        </Button>
      </Box>
    </Box>

  );
}

export const KernelDashboard = {
  AppComponent,
  ToolbarComponent,
};

export default KernelDashboard;
/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState, useEffect } from 'react';

import {
  Box,
  Input,
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
  Icon,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  useDisclosure,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@chakra-ui/react';

import { MdRefresh, MdRestartAlt, MdCode, MdDelete, MdLock, MdLockOpen } from 'react-icons/md';

import { truncateWithEllipsis, useHexColor, useAppStore, useUser, useUIStore } from '@sage3/frontend';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

const heartBeatTimeCheck = 1000 * 20 * 60; // 20 mins

const fakeKernel = {
  label: '1234',
  key: '1234',
  value: {
    is_private: false,
    owner_uuid: '1234',
    kernel_alias: 'testKernel',
    kernel_name: 'python',
  },
};

/* App component for KernelDashboard */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // User
  const { user } = useUser();
  const [myKernels, setMyKernels] = useState(s.availableKernels);

  // UI
  // const scale = useUIStore((state) => state.scale);
  const red = useHexColor('red');
  const green = useHexColor('green');
  const headerBackground = useColorModeValue('gray.500', 'gray.900');
  const tableBackground = useColorModeValue('gray.50', 'gray.700');
  const tableDividerColor = useColorModeValue('gray.200', 'gray.600');
  const scrollColor = useHexColor(tableDividerColor);
  const scrollColorFix = useHexColor(tableBackground);
  const teal = useHexColor('teal');

  useEffect(() => {
    const checkHeartBeat = setInterval(async () => {
      const response = await fetch('/api/time');
      const time = await response.json();
      const delta = Math.round(Math.abs(time.epoch - s.lastHeartBeat) / 1000);
      if (delta > heartBeatTimeCheck && s.online) {
        updateState(props._id, { online: false });
      }
      // console.log('Heartbeat delta: ', delta);
    }, 45 * 1000); // 45 Seconds
    return () => clearInterval(checkHeartBeat);
  }, [s.lastHeartBeat, s.online]);

  // Get all available Kernels
  // AvailabileKernels is set by Python in /smartbits/kerneldashboard.py at the creation of this app
  useEffect(() => {
    const kernels: any[] = [
      // fakeKernel, fakeKernel
    ];
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
    if (!user) return;
    createApp({
      title: `${kernelAlias}`,
      roomId: props.data.roomId,
      boardId: props.data.boardId,
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
      raised: true,
    });
  };

  return (
    <AppWindow app={props}>
      <VStack w={'100%'} h={'100%'}>
        {/* Header */}
        <VStack
          w={'100%'}
          background={headerBackground}
          pt="2"
          pb="2"
          height="45px"
          position="absolute"
          left="0"
          top="0"
          zIndex={1}
          overflow="hidden"
          borderRadius="8px 8px 0 0"
          borderBottom={`2px solid ${scrollColorFix}`}
        >
          <Flex w="100%" fontFamily="mono" alignItems="center" justifyContent="center" userSelect={'none'}>
            <Box justifyContent="center" display="flex" flexGrow={1} flexBasis={0} color="white" fontWeight={'bold'} fontSize="lg">
              Private
            </Box>
            <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0} color="white" fontWeight={'bold'} fontSize="lg">
              Alias
            </Box>
            <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0} color="white" fontWeight={'bold'} fontSize="lg">
              Kernel Id
            </Box>
            <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0} color="white" fontWeight={'bold'} fontSize="lg">
              Type
            </Box>
            <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0} color="white" fontWeight={'bold'} fontSize="lg">
              Actions
            </Box>
          </Flex>
        </VStack>

        {/* Kernel List */}
        <VStack
          w={'100%'}
          position="absolute"
          background={tableBackground}
          left="0"
          top="32px"
          pt="2"
          height={`calc(100% - 40px)`}
          borderRadius="0 0 8px 8px"
          overflowY={'auto'}
          css={{
            '&::-webkit-scrollbar': {
              width: '12px',
            },
            '&::-webkit-scrollbar-track': {
              width: '8px',
              background: 'transparent',
              borderRadius: '5px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: scrollColor,
              borderRadius: '8px',
              borderRight: `solid ${scrollColorFix} 2px`,
              borderLeft: `solid ${scrollColorFix} 2px`,
            },
          }}
        >
          {
            // If there are kernels, display them
            myKernels.map((kernel, idx) => (
              <>
                <Box minHeight="2px" width="98%" backgroundColor={tableDividerColor} />

                <Flex w="100%" fontFamily="mono" alignItems="center" justifyContent="center" userSelect={'none'} key={kernel.key + idx}>
                  {/* Status Icon */}
                  <Box justifyContent="center" display="flex" flexGrow={1} flexBasis={0}>
                    {kernel.value.is_private ? (
                      <Icon as={MdLock} fontSize="24px" color={'red.500'} />
                    ) : (
                      <Icon as={MdLockOpen} fontSize="24px" color="green.500" />
                    )}
                  </Box>
                  {/* Kernel Name */}
                  <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0}>
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
                  {/* Alias */}
                  <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0}>
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
                  {/* Kernel Type */}
                  <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0}>
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
                  {/* Actions */}
                  <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0}>
                    <Flex alignItems="right">
                      <Tooltip label={'Open a SageCell'} placement="top" fontSize="md" hasArrow>
                        <IconButton
                          variant="ghost"
                          size="md"
                          onClick={() => {
                            startSageCell(kernel.key, kernel.value.kernel_alias);
                          }}
                          aria-label="Delete Kernel"
                          icon={<MdCode color={teal} size="24px" />}
                        />
                      </Tooltip>
                      <Tooltip label={'Restart Kernel'} placement="top" fontSize="md" hasArrow>
                        <IconButton
                          mx={2} // this provides spacing between the buttons
                          variant="ghost"
                          size="md"
                          onClick={() => {
                            restartKernel(kernel.key);
                          }}
                          aria-label="Restart Kernel"
                          icon={<MdRestartAlt color={teal} size="24px" />}
                        />
                      </Tooltip>
                      <Tooltip label="Delete kernel" aria-label="Delete kernel" placement="top" fontSize="md" hasArrow>
                        <IconButton
                          variant="ghost"
                          size="md"
                          aria-label="Delete Kernel"
                          onClick={() => {
                            removeKernel(kernel.key);
                          }}
                          icon={<MdDelete color={red} size="24px" />}
                        />
                      </Tooltip>
                    </Flex>
                  </Box>
                </Flex>
              </>
            ))
          }
        </VStack>

        <Tooltip label={s.online ? 'Python Online' : 'Python Offline'} aria-label="Proxy Status" placement="top" fontSize="md" hasArrow>
          <Box
            width="20px"
            height="20px"
            position="absolute"
            right="3"
            top="1"
            borderRadius="100%"
            zIndex={5}
            backgroundColor={s.online ? green : red}
          ></Box>
        </Tooltip>
      </VStack>
    </AppWindow>
  );
}

/* App toolbar component for the app KernelDashboard */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const { user } = useUser();

  // Checkbox private selection
  const [isPrivate, setIsPrivate] = useState(false);
  const [kernelAlias, setKernelAlias] = useState<string>('');
  const [kernelName, setKernelName] = useState<string>('python3');
  // Modal window
  const { isOpen, onOpen, onClose } = useDisclosure();
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
          room_uuid: props.data.roomId,
          board_uuid: props.data.boardId,
          owner_uuid: user._id,
          is_private: isPrivate,
        },
      },
    });
    if (isOpen) onClose();
    setKernelAlias('');
    setIsPrivate(false);
  };

  // Triggered on every keystroke
  function changeAlias(e: React.ChangeEvent<HTMLInputElement>) {
    const cleanAlias = e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '');
    setKernelAlias(cleanAlias);
  }

  return (
    <HStack>
      <Button size="xs" colorScheme="teal" onClick={onOpen}>
        Create New Kernel
      </Button>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top" hasArrow={true} label={'Refresh List of Kernels'} openDelay={400}>
          <Button
            size="xs"
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

      <Modal isOpen={isOpen} onClose={onClose} size="sm" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Kernel</ModalHeader>
          <ModalBody>
            Type
            <Select
              size="md"
              value={kernelName}
              placeholder="Select Kernel Type"
              width="100%"
              onChange={(e) => {
                setKernelName(e.target.value);
              }}
              mt="1"
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
            <Spacer my="4" />
            Alias
            <Input
              placeholder="Enter kernel alias..."
              variant="outline"
              size="md"
              mt="1"
              value={kernelAlias}
              onChange={changeAlias}
              onPaste={(event) => {
                event.stopPropagation();
              }}
            />
            <Spacer my="4" />
            Private
            <Checkbox
              checked={isPrivate}
              borderRadius={2}
              verticalAlign={'middle'}
              colorScheme="teal"
              p={0}
              ml={1}
              onChange={() => setIsPrivate(!isPrivate)}
            />
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="red" mr="2" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="teal" onClick={addKernel}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </HStack>
  );
}

export default { AppComponent, ToolbarComponent };

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  useColorModeValue,
  VStack,
  Tooltip,
  Box,
  Badge,
  Text,
  useToast,
  Flex,
  IconButton,
  Icon,
  Divider,
  useDisclosure,
  Button,
  Spacer,
  ButtonGroup,
} from '@chakra-ui/react';
import {
  CreateKernelModal,
  useAppStore,
  useCursorBoardPosition,
  useHexColor,
  useKernelStore,
  usePluginStore,
  useUIStore,
  useUser,
} from '@sage3/frontend';
import { format, set } from 'date-fns';
import { ButtonPanel, Panel } from '../Panel';
import { useEffect, useState } from 'react';
import { KernelInfo } from '@sage3/shared/types';
import { MdCode, MdDelete, MdLock, MdLockOpen, MdRestartAlt } from 'react-icons/md';

export interface KernelsPanelProps {
  boardId: string;
  roomId: string;
}

/**
 * Panel to show all the Server's plugins and allow the users to create new apps from them
 * @param props
 * @returns
 */
export function KernelsPanel(props: KernelsPanelProps) {
  // Create new sagecells
  const createApp = useAppStore((state) => state.create);

  // Board Position
  const { scale, boardPosition } = useUIStore((state) => state);

  // User
  const { user } = useUser();

  // UI Styling
  const red = useHexColor('red');
  const green = useHexColor('green');
  const tableBackground = useColorModeValue('gray.50', 'gray.700');
  const tableDividerColor = useColorModeValue('gray.200', 'gray.600');

  // Disclousre for the create kernel modal
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Toast
  const toast = useToast();

  // Kernel Store
  const { kernels, createKernel, deleteKernel, restartKernel, interruptKernel, apiStatus } = useKernelStore((state) => state);

  // Local kernel state
  const [myKernels, setMyKernels] = useState<KernelInfo[]>([]);

  // This all happens when the app is first loaded

  // Set My Kernels
  useEffect(() => {
    console.log(kernels);
    filterAndSetMyKernels(kernels);
  }, [kernels.length]);
  // Filter out this board's kernels and boards this user has access to
  const filterAndSetMyKernels = (kernels: KernelInfo[]) => {
    const filteredKernels = kernels.filter((kernel) => kernel.board === props.boardId && hasKernelAccess(kernel));
    setMyKernels(filteredKernels);
  };

  /**
   * Check if the user has access to the kernel
   * @param {KernelInfo} kernel
   * @returns {boolean}
   * @memberof SageCell
   */
  const hasKernelAccess = (kernel: KernelInfo): boolean => {
    return !kernel.is_private || (kernel.is_private && kernel.owner === user?._id);
  };
  /**
   * Remove the kernel if the user confirms the action
   * @param kernelId the id of the kernel to remove
   *
   * @returns void
   */
  const handleDeleteKernel = async (kernelId: string) => {
    const response = await deleteKernel(kernelId);
    toast({
      title: response ? 'Success' : 'Error',
      description: response ? 'The kernel has been deleted' : 'Encountered an error while deleting the kernel',
      status: response ? 'success' : 'error',
      duration: 3000,
      isClosable: true,
    });
  };

  /**
   * Restart the kernel
   * @param kernelId the id of the kernel to restart
   *
   * @returns void
   */
  const handleRestartKernel = async (kernelId: string) => {
    const repsonse = await restartKernel(kernelId);
    toast({
      title: repsonse ? 'Success' : 'Error',
      description: repsonse ? 'The kernel has been restarted' : 'Encountered an error while restarting the kernel',
      status: repsonse ? 'success' : 'error',
      duration: 3000,
      isClosable: true,
    });
  };

  /**
   * Open SageCell using the kernel
   * @param kernelId the id of the kernel to restart
   *
   * @returns void
   */
  const handleCreateSageCell = (kernelInfo: KernelInfo) => {
    if (!user) return;
    const x = Math.floor(-boardPosition.x + window.innerWidth / 2 / scale - 300);
    const y = Math.floor(-boardPosition.y + window.innerHeight / 2 / scale - 300);
    createApp({
      title: `${kernelInfo.alias}`,
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x, y, z: 0 },
      size: { width: 600, height: 600, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'SageCell',
      state: {
        code: '',
        msgId: '',
        history: [],
        streaming: false,
        language: 'python',
        fontSize: 16,
        kernel: kernelInfo.kernel_id,
        session: '',
        executeInfo: { executeFunc: '', params: {} },
      },
      raised: true,
      dragging: false,
    });
  };

  return (
    <Panel title={'Kernels'} name="kernels" width={0} showClose={false}>
      <Box display="flex" flexDirection="column">
        <Box alignItems="left" p="1" width={880} display="flex" flexDirection={'column'}>
          <>
            {/* Headers */}
            <Flex w="1000px" fontFamily="mono" alignItems="left" userSelect={'none'}>
              <Box w="80px">Private</Box>
              <Box w="200px">Alias</Box>
              <Box w="400px">Kernel ID</Box>
              <Box w="100px">Type</Box>
              <Box w="200px">Actions</Box>
            </Flex>
            <Divider mb={1} />
            {myKernels.length == 0 ? (
              <Text fontWeight={'bold'} width="100%" textAlign="center">
                No Available Kernels.
              </Text>
            ) : (
              myKernels.map((kernel) => (
                <Flex w="1000px" fontFamily="mono" alignItems="left" userSelect={'none'} my={1.5} key={kernel.kernel_id}>
                  <Box w="80px" fontSize="xl" pl="5" lineHeight={'32px'}>
                    {kernel.is_private ? <MdLock color={red} /> : <MdLockOpen color={green} />}
                  </Box>
                  <Box w="200px" whiteSpace={'nowrap'} textOverflow="ellipsis" overflow={'hidden'}>
                    {kernel.alias}
                  </Box>
                  <Box w="400px" whiteSpace={'nowrap'} textOverflow="ellipsis" overflow={'hidden'}>
                    {kernel.kernel_id}
                  </Box>
                  <Box w="100px">{kernel.name}</Box>
                  <Box w="200px">
                    <Tooltip placement="top" hasArrow={true} label={'Create SAGECell'} openDelay={400}>
                      <IconButton
                        onClick={() => handleCreateSageCell(kernel)}
                        colorScheme="green"
                        icon={<MdCode />}
                        fontSize="xl"
                        size="xs"
                        aria-label={''}
                        mr={2}
                      />
                    </Tooltip>
                    <Tooltip placement="top" hasArrow={true} label={'Restart Kernel'} openDelay={400}>
                      <IconButton
                        onClick={() => handleRestartKernel(kernel.kernel_id)}
                        colorScheme="yellow"
                        icon={<MdRestartAlt />}
                        size="xs"
                        fontSize="xl"
                        aria-label={''}
                        mr={2}
                      />
                    </Tooltip>

                    <Tooltip placement="top" hasArrow={true} label={'Delete Kernel'} openDelay={400}>
                      <IconButton
                        onClick={() => handleDeleteKernel(kernel.kernel_id)}
                        colorScheme="red"
                        icon={<MdDelete />}
                        fontSize="xl"
                        size="xs"
                        aria-label={''}
                        mr={2}
                      />
                    </Tooltip>
                  </Box>
                </Flex>
              ))
            )}
          </>
        </Box>
        <Divider p={0} mt={1} mb={2} />
        <Flex>
          <Box ml="1">
            <Box width={'16px'} height={'16px'} borderRadius={'100%'} backgroundColor={apiStatus ? green : red} mt="1"></Box>
          </Box>
          <Text ml="1" fontSize="sm" fontWeight="bold">
            {apiStatus ? 'Python Online' : 'Python Offline'}
          </Text>
          <Spacer />
          <Button colorScheme="green" width="100px" size={'xs'} onClick={onOpen}>
            Create Kernel
          </Button>
        </Flex>
        <CreateKernelModal isOpen={isOpen} onClose={onClose} />
      </Box>
    </Panel>
  );
}

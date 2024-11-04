/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React
import { Tooltip, Box, Text, useToast, Flex, IconButton, Divider, useDisclosure, Button, Spacer, HStack } from '@chakra-ui/react';
import { MdCode, MdDelete, MdLock, MdLockOpen, MdRestartAlt } from 'react-icons/md';

// SAGE3 imports
import { CreateKernelModal, useAppStore, useHexColor, useKernelStore, useThrottleScale, useUIStore, useUser } from '@sage3/frontend';
import { KernelInfo } from '@sage3/shared/types';

// App imports
import { useEffect, useState } from 'react';

// Props to the Kernels Panel component
export interface KernelsMenuProps {
  boardId: string;
  roomId: string;
}

/**
 * Panel to show all the kernels available to the user
 * @param props
 * @returns
 */
export function KernelsMenu(props: KernelsMenuProps) {
  // Create new sagecells
  const createApp = useAppStore((state) => state.create);

  // Board Position
  const scale = useThrottleScale(250);
  const boardPosition = useUIStore((state) => state.boardPosition);

  // User
  const { user } = useUser();

  // UI Styling
  const red = useHexColor('red');
  const green = useHexColor('green');

  // Disclousre for the create kernel modal
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Toast
  const toast = useToast();

  // Kernel Store
  const kernels = useKernelStore((state) => state.kernels);
  const fetchKernels = useKernelStore((state) => state.fetchKernels);
  const deleteKernel = useKernelStore((state) => state.deleteKernel);
  const restartKernel = useKernelStore((state) => state.restartKernel);
  const apiStatus = useKernelStore((state) => state.apiStatus);
  const keepChecking = useKernelStore((state) => state.keepChecking);
  const stopChecking = useKernelStore((state) => state.stopChecking);

  // Local kernel state
  const [myKernels, setMyKernels] = useState<KernelInfo[]>([]);

  // This all happens when the app is first loaded

  // Set My Kernels
  useEffect(() => {
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
      pinned: false,
    });
  };

  /**
   * Refresh the list of kernels
   */
  const handleRefreshList = async () => {
    const response = await fetchKernels();
    console.log(response);
    toast({
      title: response ? 'Success' : 'Error',
      description: response ? 'The kernel list has been refreshed' : 'Encountered an error while refreshing the kernel list',
      status: response ? 'success' : 'error',
      duration: 3000,
      isClosable: true,
    });
  };

  // Start checking for kernels and stopping when leaving the board
  useEffect(() => {
    keepChecking();
    return () => {
      stopChecking();
    };
  }, []);

  return (
    <Box display="flex" flexDirection="column" fontSize={'xs'}>
      <Box alignItems="left" p="1" width={670} display="flex" flexDirection={'column'}>
        {/* Headers */}
        <Flex w="670px" fontFamily="mono" alignItems="left" userSelect={'none'}>
          <Box w="70px">Private</Box>
          <Box w="120px">Alias</Box>
          <Box w="280px">Kernel ID</Box>
          <Box w="100px">Type</Box>
          <Box w="100px">Actions</Box>
        </Flex>
        <Divider mb={1} />
        {myKernels.length == 0 ? (
          <Text fontWeight={'bold'} width="100%" textAlign="center">
            No Available Kernels.
          </Text>
        ) : (
          myKernels.map((kernel) => (
            <Flex w="1000px" fontFamily="mono" alignItems="left" userSelect={'none'} my={1} key={kernel.kernel_id}>
              <Box w="70px" fontSize="xl" pl="4">
                {kernel.is_private ? <MdLock color={red} /> : <MdLockOpen color={green} />}
              </Box>
              <Box w="120px" whiteSpace={'nowrap'} textOverflow="ellipsis" overflow={'hidden'} fontWeight={'bold'}>
                {kernel.alias}
              </Box>
              <Box w="280px" whiteSpace={'nowrap'} textOverflow="ellipsis" overflow={'hidden'}>
                {kernel.kernel_id}
              </Box>
              <Box w="100px">{kernel.name}</Box>
              <Box w="100px">
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
      </Box>
      <Divider p={0} mt={1} mb={2} />
      <Flex>
        <HStack p={0} m={0}>
          <Box ml={1}>
            <Box width={'12px'} height={'12px'} borderRadius={'100%'} backgroundColor={apiStatus ? green : red} mt="0"></Box>
          </Box>
          <Text ml={0} fontSize="sm">
            Kernel Service {apiStatus ? ' Online' : 'Offline'}
          </Text>
        </HStack>
        <Spacer />
        <Button colorScheme="gray" width="100px" size={'xs'} mr="2" onClick={handleRefreshList}>
          Refresh List
        </Button>
        <Button colorScheme="green" width="100px" size={'xs'} onClick={onOpen}>
          Create Kernel
        </Button>
      </Flex>
      {isOpen && <CreateKernelModal isOpen={isOpen} onClose={onClose} />}
    </Box>
  );
}

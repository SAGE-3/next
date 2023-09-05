/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect } from 'react';

import { Box, Text, Tooltip, Flex, IconButton, VStack, Icon, useColorModeValue, useToast } from '@chakra-ui/react';

import { MdRestartAlt, MdCode, MdDelete, MdLock, MdLockOpen } from 'react-icons/md';

import { truncateWithEllipsis, useHexColor, useAppStore, useUser } from '@sage3/frontend';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';
import { ToolbarComponent } from './components/toolbar';
import { KernelInfo } from '@sage3/shared/types';

/**
 * This is a sample state for testing the UI without a backend
 */

// URL for the FastAPI backend
const baseURL = '/api/fastapi';

/* App component for KernelDashboard */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const createApp = useAppStore((state) => state.create);
  const updateState = useAppStore((state) => state.updateState);

  // User
  const { user } = useUser();

  // UI
  const red = useHexColor('red');
  const green = useHexColor('green');
  const headerBackground = useColorModeValue('gray.500', 'gray.900');
  const tableBackground = useColorModeValue('gray.50', 'gray.700');
  const tableDividerColor = useColorModeValue('gray.200', 'gray.600');
  const scrollColor = useHexColor(tableDividerColor);
  const scrollColorFix = useHexColor(tableBackground);
  const teal = useHexColor('teal');
  const toast = useToast();
  const [myKernels, setMyKernels] = useState<KernelInfo[]>([]);

  // This all happens when the app is first loaded
  useEffect(() => {
    getKernelCollection();
  }, []);

  useEffect(() => {
    if (!s.online) {
      console.log('Kernel Proxy Server offline');
      getKernelCollection();
    }
  }, [s.online]);

  useEffect(() => {
    // update myKernels when the s.kernels changes
    if (s.kernels) {
      const myKernels = s.kernels.reduce((kernels, kernel) => {
        if (
          kernel.room === props.data.roomId &&
          kernel.board === props.data.boardId &&
          (!kernel.is_private || (kernel.is_private && kernel.owner === user?._id))
        ) {
          kernels.push(kernel);
        }
        return kernels;
      }, [] as KernelInfo[]);
      setMyKernels(myKernels);
    }
  }, [JSON.stringify(s.kernels)]);

  const getKernelCollection = async () => {
    try {
      const response = await fetch(`${baseURL}/collection`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        console.log('Failed to get kernel collection');
        return;
      }
      const kernelCollection = (await response.json()) as KernelInfo[];
      if (kernelCollection !== s.kernels) {
        updateState(props._id, {
          kernels: kernelCollection,
          online: true,
        });
      }
    } catch (error) {
      if (error instanceof TypeError) {
        console.log('Kernel Proxy Server offline: ', error.message);
        updateState(props._id, {
          kernels: [],
          online: false,
        });
        setMyKernels([]);
      }
    }
  };

  /**
   * Remove the kernel if the user confirms the action
   * @param kernelId the id of the kernel to remove
   *
   * @returns void
   */
  const deleteKernel = async (kernelId: string) => {
    if (!s.online) return;
    const response = await fetch(`${baseURL}/kernels/${kernelId}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      toast({
        title: 'Kernel Deleted',
        description: 'The kernel has been deleted',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      getKernelCollection();
    } else {
      toast({
        title: 'Failed to delete kernel',
        description: 'The kernel failed to delete',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  /**
   * Restart the kernel
   * @param kernelId the id of the kernel to restart
   *
   * @returns void
   */
  const restartKernel = async (kernelId: string) => {
    if (!s.online) return;
    const response = await fetch(`${baseURL}/restart/${kernelId}`, {
      method: 'POST',
    });
    if (response.ok) {
      toast({
        title: 'Kernel Restarted',
        description: 'The kernel has been restarted',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Failed to restart kernel',
        description: 'The kernel failed to restart',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
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
        output: '',
        language: 'python',
        fontSize: 16,
        theme: 'vs-dark',
        kernel: kernelId,
        kernels: [],
        privateMessage: [],
        executeInfo: { executeFunc: '', params: {} },
      },
      raised: true,
      dragging: false,
    });
  };

  return (
    <AppWindow app={props}>
      <VStack w={'100%'} h={'100%'}>
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
          <Flex w="100%" alignItems="center" justifyContent="center" userSelect={'none'}>
            <Box justifyContent="center" display="flex" flexGrow={1} flexBasis={0} color="white">
              Private
            </Box>
            <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0} color="white">
              Alias
            </Box>
            <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0} color="white">
              Kernel Id
            </Box>
            <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0} color="white">
              Type
            </Box>
            <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0} color="white">
              Actions
            </Box>
          </Flex>
        </VStack>
        {!s.online ? null : (
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
            {myKernels.length === 0 ? ( // If there are no kernels, display a message
              <Box w="100%" textAlign="center" color="gray.500" mt="5%">
                <Text fontSize="2xl">No kernels available</Text>
              </Box>
            ) : (
              // If there are kernels, display them
              myKernels.map((kernel) => (
                <Box key={kernel.kernel_id} w="100%">
                  <Box minHeight="2px" width="98%" backgroundColor={tableDividerColor} />
                  <Flex w="100%" fontFamily="mono" alignItems="center" justifyContent="center" userSelect={'none'}>
                    {/* Status Icon */}
                    <Box justifyContent="center" display="flex" flexGrow={1} flexBasis={0}>
                      {kernel.is_private ? (
                        <Icon as={MdLock} fontSize="24px" color={'red.500'} />
                      ) : (
                        <Icon as={MdLockOpen} fontSize="24px" color="green.500" />
                      )}
                    </Box>
                    {/* Kernel Name */}
                    <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0}>
                      <Text
                        onClick={() => {
                          navigator.clipboard.writeText(kernel.alias);
                        }}
                        fontSize="md"
                      >
                        {kernel.alias}
                      </Text>
                    </Box>
                    {/* Alias */}
                    <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0}>
                      <Text
                        onClick={() => {
                          navigator.clipboard.writeText(kernel.kernel_id);
                        }}
                        ml={2}
                      >
                        <Tooltip label={kernel.kernel_id} placement="top" fontSize="xs" hasArrow>
                          {truncateWithEllipsis(kernel.kernel_id, 8)}
                        </Tooltip>
                      </Text>
                    </Box>
                    {/* Kernel Type */}
                    <Box justifyContent="left" display="flex" flexGrow={1} flexBasis={0}>
                      <Text>
                        {kernel.name === 'ir'
                          ? 'R'
                          : kernel.name === 'python3'
                          ? 'Python'
                          : kernel.name === 'julia-1.8'
                          ? 'Julia'
                          : kernel.name}
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
                              startSageCell(kernel.kernel_id, kernel.alias);
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
                              restartKernel(kernel.kernel_id);
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
                              deleteKernel(kernel.kernel_id);
                            }}
                            icon={<MdDelete color={red} size="24px" />}
                          />
                        </Tooltip>
                      </Flex>
                    </Box>
                  </Flex>
                </Box>
              ))
            )}
          </VStack>
        )}

        <Tooltip label={s.online ? 'Python Online' : 'Python Offline'} aria-label="Proxy Status" placement="top" fontSize="md" hasArrow>
          <Box
            width="20px"
            height="20px"
            position="absolute"
            right="3"
            top="2.5"
            borderRadius="100%"
            zIndex={5}
            backgroundColor={s.online ? green : red}
          ></Box>
        </Tooltip>
      </VStack>
    </AppWindow>
  );
}
export default { AppComponent, ToolbarComponent };

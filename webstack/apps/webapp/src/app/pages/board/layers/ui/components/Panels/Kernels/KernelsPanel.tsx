/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';

import { Box, Text, Tooltip, Flex, IconButton, VStack, Icon, useColorModeValue } from '@chakra-ui/react';
import { MdRefresh, MdRestartAlt, MdCode, MdDelete, MdLock, MdLockOpen } from 'react-icons/md';

import { Panel } from '../Panel';
import { useHexColor, useUser, useAppStore, truncateWithEllipsis } from '@sage3/frontend';

import { z } from 'zod';

const Kschema = z.object({
  kernelSpecs: z.array(z.string()),
  availableKernels: z.array(
    z.object({
      key: z.string(),
      value: z.record(z.string(), z.any()),
    })
  ),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
  lastHeartBeat: z.number(),
  online: z.boolean(),
});

type Kstate = z.infer<typeof Kschema>;

const initState: Partial<Kstate> = {
  kernelSpecs: [],
  availableKernels: [],
  executeInfo: { executeFunc: '', params: {} },
  online: false,
  lastHeartBeat: 0,
};


export interface KernelsProps {
  roomId: string;
  boardId: string;
}

export function KernelsPanel(props: KernelsProps) {
  const s = initState;
  const createApp = useAppStore((state) => state.create);
  const update = useAppStore((state) => state.update);
  // User
  const { user } = useUser();
  const [myKernels, setMyKernels] = useState(s.availableKernels);

  // UI
  const red = useHexColor('red');
  const green = useHexColor('green');
  const headerBackground = useColorModeValue('gray.500', 'gray.900');
  const tableBackground = useColorModeValue('gray.50', 'gray.700');
  const tableDividerColor = useColorModeValue('gray.200', 'gray.600');
  const scrollColor = useHexColor(tableDividerColor);
  const scrollColorFix = useHexColor(tableBackground);
  const teal = useHexColor('teal');

  /**
   * Remove the kernel if the user confirms the action
   * @param kernelId the id of the kernel to remove
   *
   * @returns void
   */
  const removeKernel = (kernelId: string) => {
    if (!user || !kernelId) return;
    // updateState(props._id, {
    //   executeInfo: {
    //     executeFunc: 'delete_kernel',
    //     params: {
    //       kernel_id: kernelId,
    //       user_uuid: user._id,
    //     },
    //   },
    // });
  };

  /**
   * Restart the kernel
   * @param kernelId the id of the kernel to restart
   *
   * @returns void
   */
  const restartKernel = (kernelId: string) => {
    if (!user || !kernelId) return;
    // updateState(props._id, { executeInfo: { executeFunc: 'restart_kernel', params: { kernel_id: kernelId, user_uuid: user._id } } });
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
      roomId: props.roomId,
      boardId: props.boardId,
      // position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
      position: { x: 100, y: 100, z: 0 },
      // size: { width: 600, height: props.data.size.height, depth: 0 },
      size: { width: 600, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'SageCell',
      state: {
        code: '',
        language: 'python',
        fontSize: 16,
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
    <Panel title={'Kernels'} name="kernels" width={750} showClose={true}>
      <Box alignItems="center" pb="1" width="100%" display="flex">
        <VStack w={750} h={'100%'}>
          {/* Header */}
          <VStack
            w={'100%'}
            background={headerBackground}
            pt="2"
            pb="2"
            height="45px"
            // position="absolute"
            // left="0"
            // top="0"
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

          {/* Kernel List */}
          <VStack
            w={'100%'}
            background={tableBackground}
            // position="absolute"
            // left="0"
            // top="32px"
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
              myKernels?.map((kernel, idx) => (
                <Box key={kernel.key} w="100%">
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
                </Box>
              ))
            }
          </VStack>

          <Tooltip label={s.online ? 'Python Online' : 'Python Offline'} aria-label="Proxy Status" placement="top" fontSize="md" hasArrow>
            <Box
              width="20px"
              height="20px"
              // position="absolute"
              // right="3"
              // top="1"
              borderRadius="100%"
              zIndex={5}
              backgroundColor={s.online ? green : red}
            ></Box>
          </Tooltip>
        </VStack>
      </Box>
    </Panel>
  );
}
/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import {
  useColorModeValue, Box, Input, InputGroup, Select, Text, Tooltip, 
  Stack, Collapse, Flex, Icon, IconButton, HStack, Badge
} from '@chakra-ui/react';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';
import { useAppStore, GetConfiguration, useUser, truncateWithEllipsis } from '@sage3/frontend';
import { useState, useEffect } from 'react';
import { MdRemove, MdAdd, MdRefresh, MdRestartAlt, MdCode } from 'react-icons/md';
import { useLocation } from 'react-router-dom';
import { Kernel } from '.';

/* App component for KernelDashboard */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [headers, setHeaders] = useState({} as { [key: string]: string });
  const [baseUrl, setBaseUrl] = useState<string>();
  const [kernels, setKernels] = useState<Kernel[]>([]); // KernelProps[];
  const [kernelOptions, setKernelOptions] = useState<string[]>([]);
  const [selectedKernelToAdd, setSelectedKernelToAdd] = useState<string>('python3');
  const [kernelIdentifier, setKernelIdentifier] = useState({} as { [key: string]: string });
  const [kernelName, setKernelName] = useState<string>('');
  const createApp = useAppStore((state) => state.create);
  const { user } = useUser();
  const location = useLocation();
  const locationState = location.state as { boardId: string; roomId: string };

  /**
   * Get the token and production state when the component mounts
   * 
   * @returns  void
   */
  useEffect(() => {
    GetConfiguration().then((conf) => {
      if (conf.token) {
        setHeaders({ Authorization: `Token ${conf.token}` });
      }
      !conf.production ? setBaseUrl(`http://${window.location.hostname}`) : setBaseUrl(`http://${window.location.hostname}:4443`);
    });
  }, []);

  // legacy code to fetch via API call

  // useEffect(() => {
  //   if (kernels) {
  //     updateState(props._id, { kernels: kernels });
  //   }
  // }, [kernels]);

  // const getKernels = () => {
  //   fetch(`${baseUrl}/api/kernels`, { headers: headers })
  //     .then((res) => res.json())
  //     .then((data) => {
  //       setKernels(data);
  //     });
  // };

  /**
   * Update the kernels list by fetching the kernels from the backend
   * and updating the state
   */
  const refresh = () => {
    updateState(props._id, { executeInfo: { executeFunc: 'refresh_list', params: {} } });
  };

  const addKernel = (kernelName: string) => {
    updateState(props._id, { executeInfo: { executeFunc: 'add_kernel', params: { kernel_name: kernelName, path: '/boards' } } });
  };

  const getKernelSpecs = () => {
    fetch(`${baseUrl}/api/kernelspecs`, { headers: headers })
      .then((res) => res.json())
      .then((data) => {
        setKernelOptions(Object.keys(data.kernelspecs));
      });
  };

  // Triggered on every keystroke
  function changeName(e: React.ChangeEvent<HTMLInputElement>) {
    const cleanName = e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '');
    setKernelName(cleanName);
  }

  // Triggered on 'enter' key
  function submitName(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Remove the kernel
   * @param kernelId the id of the kernel to remove
   *
   * @returns void
   */
  const removeKernel = (kernelId: string) => {
    updateState(props._id, { executeInfo: { executeFunc: 'delete_kernel', params: { kernel_id: kernelId } } });
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
   * @global locationState
   * @global user
   * @global createApp
   * @global props
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
      state: { kernel: kernelId, kernels: s.kernels },
      ownerId: user._id,
      minimized: false,
      raised: true,
    });
  };

  return (
    <AppWindow app={props}>
      <Box p={4} bg={useColorModeValue('#E8E8E8', '#1A1A1A')}>
        <Stack spacing={2}>
          <HStack>
            <IconButton
              variant="outline"
              m={0.5}
              size="md"
              aria-label="Add Kernel"
              onClick={() => addKernel(selectedKernelToAdd)}
              colorScheme="teal"
              icon={<MdAdd />}
            />
            <Box w="100%">
              <Select
                variant="outline"
                size="md"
                colorScheme="teal"
                value={selectedKernelToAdd}
                placeholder="Select kernel"
                onFocus={getKernelSpecs}
                onChange={(e) => {
                  setSelectedKernelToAdd(e.target.value);
                }}
              >
                {kernelOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Box>
            <Box w="100%">
              <form onSubmit={submitName}>
                <InputGroup>
                  <Input
                    placeholder="Kernel Name"
                    variant="outline"
                    size="md"
                    _placeholder={{ opacity: 1, color: 'gray.600' }}
                    value={kernelName}
                    onChange={changeName}
                    onPaste={(event) => {
                      event.stopPropagation();
                    }}
                    backgroundColor="whiteAlpha.300"
                    padding={'0 4px 0 4px'}
                  />
                </InputGroup>
              </form>
            </Box>
          </HStack>
          {
            // sort kernels by last_activity (most recent first)
            s.kernels
              .sort((a, b) => (a.last_activity < b.last_activity ? 1 : -1))
              .map((kernel) => (
                <Box key={kernel.id} p={2} bg={useColorModeValue('#E8E8E8', '#1A1A1A')}>
                  {/* // s.kernels.map((kernel, idx) => {
            // console.log('kernel', kernel);
            return (
              <Box key={idx}>
                <Box bg={useColorModeValue('#EEE', '#333')}> */}
                  <Flex p={1} bg="cardHeaderBg" align="left" justify="space-between" shadow="sm" cursor="pointer">
                    <Box w="200px">{kernel.name}</Box>
                    <Flex alignItems="right">
                      {/* <Text color={'white'} fontWeight="bold">
                        {kernel.id}
                      </Text> */}
                      {/* show the kernel identifier associated with the kernel id */}
                      <Text
                        onClick={() => {
                          startSageCell(kernel.id);
                        }}
                        mr={10}
                        fontWeight="bold"
                      >
                        {kernelIdentifier[kernel.id]
                          ? truncateWithEllipsis(kernelIdentifier[kernel.id], 8)
                          : truncateWithEllipsis(kernel.id, 8)}
                      </Text>
                      <Text color={'blue'} fontWeight="bold">
                        { // show the last activity time in human readable format (e.g. 2 minutes ago)
                        // moment(kernel.last_activity).fromNow()}
                        timeSince(kernel.last_activity)}
                      </Text>
                      {/* <Text color={'yellow'} fontWeight="bold">
                        {kernel.execution_state}
                      </Text> */}
                      <Badge colorScheme={kernel.execution_state === 'idle' ? 'green' : 'red'}>
                        {kernel.execution_state}
                      </Badge>
                      <Text m={4} color={'red'} fontWeight="bold">
                        {kernel.connections}
                      </Text>
                      <IconButton
                        variant="outline"
                        m={0.5}
                        size="xs"
                        onClick={() => {
                          startSageCell(kernel.id);
                        }}
                        colorScheme="teal"
                        aria-label="Delete Kernel"
                        icon={<MdCode />}
                      />
                      <IconButton
                        variant="outline"
                        m={0.5}
                        size="xs"
                        onClick={() => {
                          removeKernel(kernel.id);
                        }}
                        colorScheme="teal"
                        aria-label="Delete Kernel"
                        icon={<MdRemove />}
                      />
                      <IconButton
                        variant="outline"
                        m={0.5}
                        size="xs"
                        onClick={() => {
                          restartKernel(kernel.id);
                        }}
                        colorScheme="teal"
                        aria-label="Restart Kernel"
                        icon={<MdRestartAlt />}
                      />
                    </Flex>
                  </Flex>
                </Box>
              ))
          }
        </Stack>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app KernelDashboard */

function ToolbarComponent(props: App): JSX.Element {

  // const s = props.data.state as AppState;
  // const updateState = useAppStore((state) => state.updateState);
  // const [headers, setHeaders] = useState({} as { [key: string]: string });
  // const [baseUrl, setBaseUrl] = useState<string>();
  // const [kernels, setKernels] = useState<Kernel[]>([]); // KernelProps[];
  // const [kernelOptions, setKernelOptions] = useState<string[]>([]);
  // const [selectedKernelToRemove, setSelectedKernelToRemove] = useState<string>('');

  // // get the token and production state when the component mounts
  // useEffect(() => {
  //   GetConfiguration().then((conf) => {
  //     if(conf.token) {
  //       setHeaders({ Authorization: `Token ${conf.token}` });
  //     }
  //     !conf.production 
  //     ? setBaseUrl(`http://${window.location.hostname}`) 
  //     : setBaseUrl(`http://${window.location.hostname}:4443`)
  //   });
  // }, []);

  return (
    <Box>
      <HStack>
        <IconButton
          variant="outline"
          // onClick={() => {
          //   props.data.startSageCell();
          // }}
          colorScheme="teal"
          aria-label="Start Sage Cell"
          icon={<MdCode />}
        />
      </HStack>
    </Box>
  );
}

export const KernelDashboard = {
  AppComponent,
  ToolbarComponent,
};


export default { AppComponent, ToolbarComponent };

/* App component for the app KernelDashboard */
/* Borrowed from https://stackoverflow.com/questions/3177836/ */
// TODO: use moment.js or a better function
/**
 * Convert timestamp to human readable format
 * @param last_activity 
 */
function timeSince(last_activity: string): string {
  const date = new Date(last_activity);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;

  if (interval > 1) {
    return Math.floor(interval) + ' years';
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + ' months';
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + ' days';
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + ' hours';
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + ' minutes';
  }
  return Math.floor(seconds) + ' seconds';
}
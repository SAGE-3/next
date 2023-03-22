/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import {
  Box,
  useColorModeValue,
  Divider,
  Badge,
  Spacer,
  Stack,
  Input,
  Avatar,
  AvatarBadge,
  AvatarGroup,
  Tooltip,
  IconButton,
  Icon,
} from '@chakra-ui/react';

// SAGE3 imports
import { useAppStore, useUser, useUsersStore, truncateWithEllipsis, useRoomStore } from '@sage3/frontend';

import { state as AppState, Kernels } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';
import { CodeEditor } from './components/editor';
import { Outputs } from './components/outputs';
import { ToolbarComponent } from './components/toolbar';
import { SageCellInput } from './components/input';
import './styles.css';
import { FaUserFriends } from 'react-icons/fa';
import { use } from 'passport';

/**
 * SageCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
const AppComponent = (props: App): JSX.Element => {
  const { user } = useUser();
  const { users } = useUsersStore();
  const s = props.data.state as AppState;
  const [myKernels, setMyKernels] = useState<Kernels>(s.availableKernels);
  const [access, setAccess] = useState(true);
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);

  // Needed for Div resizing
  const [editorHeight, setEditorHeight] = useState(150);

  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A');
  const accessDeniedColor = useColorModeValue('#EFDEDD', '#9C7979');

  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());
  const typingUsers = users.filter((user) => activeUsers.has(user._id));

  useEffect(() => {
    setActiveUsers(new Set([...s.activeUsers]));
  }, [JSON.stringify(s.activeUsers)]);

  useEffect(() => {
    console.log('active users', activeUsers);
  }, [activeUsers]);

  function getKernels() {
    if (!user) return;
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'get_available_kernels',
        params: { _uuid: user._id },
      },
    });
  }

  // Set the title on start
  useEffect(() => {
    // update the title of the app
    if (props.data.title !== 'SageCell') {
      update(props._id, { title: 'SageCell' });
    }
    getKernels();
  }, []);

  useEffect(() => {
    // Get all kernels that I'm available to see
    const kernels: Kernels = [];
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

  useEffect(() => {
    if (s.kernel == '') {
      setAccess(false);
    } else {
      const access = myKernels.find((kernel) => kernel.key === s.kernel);
      setAccess(access ? true : false);
      if (access) {
        const name = truncateWithEllipsis(access ? access.value.kernel_alias : s.kernel, 8);
        // update the title of the app
        update(props._id, { title: 'Sage Cell: kernel [' + name + ']' });
      }
    }
  }, [s.kernel, myKernels]);

  // handle mouse move event
  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = e.movementY;
    handleEditorResize(deltaY);
  };

  // handle mouse up event
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleEditorResize = (deltaY: number) => {
    setEditorHeight((prevHeight) => prevHeight + deltaY); // update the Monaco editor height
  };

  useEffect(() => {
    const editor = document.querySelector('.monaco-editor');
    if (editor) {
      const editorHeight = editor.clientHeight;
      setEditorHeight(editorHeight);
    }
  }, [s.kernel]);

  return (
    <AppWindow app={props}>
      {/* Wrap the code cell and output in a container */}
      <Box className="sc" h={'calc(100% - 1px)'} w={'calc(100% - 1px'}>
        <Stack direction="row" bgColor={bgColor} p={1}>
          <Badge variant="outline" colorScheme="blue">
            {s.kernel ? `Kernel: ${truncateWithEllipsis(s.kernel, 8)}` : 'No Kernel Selected'}
          </Badge>
          {!activeUsers ? null : (
            <AvatarGroup size="xs" max={10}>
              {typingUsers.map((user) => (
                <Tooltip key={user._id} label={user.data.name} placement="top">
                  <Avatar size={'2xs'} name={user.data.name} src={user.data.profilePicture} />
                </Tooltip>
              ))}
            </AvatarGroup>
          )}
          <Spacer />
          {!s.kernel && !access ? ( // no kernel selected and no access
            <Badge variant="outline" colorScheme="red">
              Offline{' '}
            </Badge>
          ) : !s.kernel && access ? ( // no kernel selected but access
            <Badge variant="outline" colorScheme="yellow">
              {/* {setAccess(false)} somewhere ?? */}
              Online{' '}
            </Badge>
          ) : s.kernel && !access ? ( // kernel selected but no access
            <Badge variant="outline" colorScheme="red">
              No Access{' '}
            </Badge>
          ) : s.kernel && access ? ( // kernel selected and access
            <Badge variant="outline" colorScheme="green">
              Online{' '}
            </Badge>
          ) : null}
        </Stack>
        <Box
          w={'100%'}
          h={'100%'}
          bg={access ? bgColor : accessDeniedColor}
          pointerEvents={access ? 'auto' : 'none'}
          display="flex"
          flexDirection="column"
          flex="1"
          whiteSpace={'pre-wrap'}
          overflowWrap="break-word"
          overflowY="auto"
        >
          {/* The code cell */}
          {/* <Box flex="1" onClick={handleOnCellClick}> */}
          <Box flex="1">
            <CodeEditor app={props} access={access} editorHeight={editorHeight} />
            <Box
              h="20px"
              background={'transparent'}
              _active={{ bg: 'transparent' }}
              _hover={{ bg: 'transparent' }}
              cursor="row-resize"
              onMouseDown={(e) => {
                e.preventDefault();
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              {/* The grab bar */}
              <Box>
                <Box className="arrow-top" />
                <Divider borderColor={'teal.600'} _hover={{ bg: 'teal.200' }} />
                <Box className="arrow-down" />
              </Box>
            </Box>
            {/* {awaitingInput ? null : (
              // <SageCellInput />
              <Box>
                <Input
                  placeholder="Enter input"
                  _placeholder={{ color: useColorModeValue('gray.800', 'gray.200') }}
                  _focus={{ borderColor: 'teal.600', boxShadow: '0 0 0 1px teal.600' }}
                  _hover={{ borderColor: 'teal.600' }}
                  size="lg"
                  variant="filled"
                  fontFamily="Menlo, Consolas"
                  fontSize={s.fontSize + 'px'}
                  rounded="none"
                  // borderColor={bgColor}
                  onChange={(e) => {
                    setInput(e.target.value);
                  }}
                  value={input}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      updateState(props._id, {
                        code: input,
                        output: '',
                        executeInfo: {
                          executeFunc: 'execute',
                          params: {
                            _uuid: user!._id,
                          },
                        },
                      });
                      setInput('');
                      setAwaitingInput(false);
                    }
                  }}
                />
              </Box>
            )} */}
            {/* The output */}
            <Box flex="1" overflow="auto" w={'100%'} h={'100%'}>
              {!s.output ? null : <Outputs output={s.output} app={props} />}
            </Box>
          </Box>
        </Box>
      </Box>
    </AppWindow>
  );
};

export default { AppComponent, ToolbarComponent };

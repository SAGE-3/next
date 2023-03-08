/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, useColorModeValue, Divider, Badge, Spacer, Stack } from '@chakra-ui/react';

// SAGE3 imports
import { useAppStore, useUser, truncateWithEllipsis } from '@sage3/frontend';

import { state as AppState, availableKernelsType } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';
import { CodeEditor } from './components/editor';
import { Outputs } from './components/outputs';
import { ToolbarComponent } from './components/toolbar';

import './styles.css';

/**
 * SageCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
const AppComponent = (props: App): JSX.Element => {
  const { user } = useUser();
  const s = props.data.state as AppState;
  const [myKernels, setMyKernels] = useState<availableKernelsType>(s.availableKernels);
  const [access, setAccess] = useState(true);
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  // Needed for Div resizing
  const [editorHeight, setEditorHeight] = useState(150); // not beign used?

  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A');
  const accessDeniedColor = useColorModeValue('#EFDEDD', '#9C7979');

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
    const kernels: availableKernelsType = [];
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
      setAccess(true); // need to check this...it's weird
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
      <Box className="sc" h={'calc(100% - 1px)'} w={'100%'} display="flex" flexDirection="column">
        <Stack direction="row" bgColor={bgColor} p={1}>
          <Badge variant="outline" colorScheme="blue">
            {s.kernel ? `Kernel: ${truncateWithEllipsis(s.kernel, 8)}` : 'No Kernel Selected'}
          </Badge>
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
            {/* The output */}
            <Box flex="1" overflow="auto" id="render-target" style={{ maxHeight: '100vh' }}>
              {!s.output ? null : <Outputs output={s.output} app={props} />}
            </Box>
          </Box>
        </Box>
      </Box>
    </AppWindow>
  );
};

export default { AppComponent, ToolbarComponent };

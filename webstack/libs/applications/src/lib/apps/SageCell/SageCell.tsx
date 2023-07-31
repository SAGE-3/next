/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, useColorModeValue, VStack } from '@chakra-ui/react';

// SAGE3 imports
import { useUser, useHexColor } from '@sage3/frontend';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';
import { CodeEditor } from './components/editor';
import { Outputs } from './components/outputs';
import { ToolbarComponent } from './components/toolbar';
import { StatusBar } from './components/status';

import './SageCell.css';
import { KernelInfo } from '../KernelDashboard';

/**
 * SageCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */

function AppComponent(props: App): JSX.Element {
  const { user } = useUser();
  if (!user) return <></>;
  const userId = user._id;
  const s = props.data.state as AppState;
  const boardId = props.data.boardId;

  const [access, setAccess] = useState(true);
  // Needed for Div resizing
  const [editorHeight, setEditorHeight] = useState(150); // not beign used?
  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A');
  const accessDeniedColor = '#EE4B2B';
  const green = useHexColor('green');
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (s.kernels) {
      const myKernels = s.kernels.reduce((accumulatedKernels, kernel) => {
        if (kernel.board === boardId && (!kernel.is_private || (kernel.is_private && kernel.owner === userId))) {
          accumulatedKernels.push(kernel);
        }
        return accumulatedKernels;
      }, [] as KernelInfo[]);
      if (s.kernel) {
        const kernel = myKernels.find((kernel) => kernel.kernel_id === s.kernel);
        setAccess(kernel ? true : false);
      }
    }
  }, [JSON.stringify(s.kernels), s.kernel]);

  const checkHeartbeat = async () => {
    const baseURL = 'http://localhost:81';
    try {
      const response = await fetch(`${baseURL}/heartbeat`, {
        method: 'GET',
      });
      if (response.ok) {
        setOnline(true);
      }
    } catch (error) {
      // setOnline(false);
      if (error instanceof TypeError) {
        console.log(`The Jupyter proxy server appears to be offline. (${error.message})`);
      }
    }
  };

  useEffect(() => {
    checkHeartbeat();
  }, []);

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

  return (
    <AppWindow app={props}>
      <VStack w={'100%'} h={'100%'} bg={bgColor} fontSize={s.fontSize + 'px'} overflowY={'auto'}>
        <Box w={'100%'} borderBottom={`5px solid ${access ? green : accessDeniedColor}`}>
          <StatusBar kernel={s.kernel} access={access} online={online} />
        </Box>
        <Box w={'100%'} display="flex" flexDirection="column" whiteSpace={'pre-wrap'}>
          <CodeEditor app={props} access={access} editorHeight={editorHeight} online={online} />
          {/* The grab bar */}
          <Box
            flex={'1'}
            my={1}
            padding={'4px'}
            background={
              'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=)'
            }
            backgroundColor={'teal'}
            backgroundRepeat={'no-repeat'}
            backgroundPosition={'center'}
            cursor="row-resize"
            onMouseDown={(e) => {
              e.preventDefault();
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
          <Outputs app={props} online={online} />
        </Box>
      </VStack>
    </AppWindow>
  );
}

export default { AppComponent, ToolbarComponent };

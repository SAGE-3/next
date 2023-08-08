/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React Imports
import { useEffect, useState } from 'react';
import { Box, useColorModeValue, VStack } from '@chakra-ui/react';

// SAGE3 Imports
import { useUser, useHexColor } from '@sage3/frontend';

// App Imports
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';

// Component Imports
import { CodeEditor, Outputs, ToolbarComponent, StatusBar } from './components';

// Style Impots
import './SageCell.css';
import { KernelInfo } from '../KernelDashboard';

/**
 * SageCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */

function AppComponent(props: App): JSX.Element {
  // App State
  const s = props.data.state as AppState;
  const boardId = props.data.boardId;

  // User info
  const { user } = useUser();
  if (!user) return <></>;
  const userId = user._id;

  // Access info
  const [access, setAccess] = useState(true);

  // Styling
  const [editorHeight, setEditorHeight] = useState(150); // not beign used?
  const backgroundColor = useColorModeValue('#E8E8E8', '#1A1A1A');
  const accessDeniedColor = useHexColor('red');
  const accessAllowedColor = useHexColor('green');
  // const [online, setOnline] = useState(false);
  const [kernel, setKernel] = useState<string>(s.kernel);

  /**
   * Populate the user's kernels and check if the user has access to the kernel
   */
  useEffect(() => {
    let kernelId = '';
    if (s.kernels) {
      const myKernels = s.kernels.reduce((kernels, kernel) => {
        if (kernel.board === boardId && (!kernel.is_private || (kernel.is_private && kernel.owner === userId))) {
          kernels.push(kernel);
        }
        return kernels;
      }, [] as KernelInfo[]);
      if (s.kernel) {
        const kernel = myKernels.find((kernel) => kernel.kernel_id === s.kernel);
        setAccess(kernel ? true : false);
        kernelId = kernel ? kernel.kernel_id : 'restricted';
      }
      setKernel(kernelId);
    }
  }, [JSON.stringify(s.kernels)]);

  // useEffect(() => {
  //   setOnline(s.online);
  // }, [s.online]);

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

  // handle editor resize
  const handleEditorResize = (deltaY: number) => {
    setEditorHeight((prevHeight) => prevHeight + deltaY); // update the Monaco editor height
  };

  return (
    <AppWindow app={props}>
      <VStack w={'100%'} h={'100%'} bg={backgroundColor} fontSize={s.fontSize + 'px'} overflowY={'auto'}>
        <Box w={'100%'} borderBottom={`5px solid ${access ? accessAllowedColor : accessDeniedColor}`}>
          <StatusBar kernel={kernel} access={access} online={s.online} />
        </Box>
        <Box w={'100%'} display="flex" flexDirection="column" whiteSpace={'pre-wrap'}>
          <CodeEditor app={props} access={access} editorHeight={editorHeight} online={s.online} />
          {/* The grab bar */}
          <Box
            className="grab-bar"
            onMouseDown={(e) => {
              e.preventDefault();
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
          <Outputs app={props} online={s.online} />
        </Box>
      </VStack>
    </AppWindow>
  );
}

export default { AppComponent, ToolbarComponent };

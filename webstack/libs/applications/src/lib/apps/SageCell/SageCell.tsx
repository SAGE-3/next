/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React imports
import { useEffect, useState } from 'react';
import { background, Box, useColorModeValue, VStack } from '@chakra-ui/react';

// SAGE3 imports
import { useUser, useAppStore, useKernelStore } from '@sage3/frontend';

// App Imports
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';

// Componet imports
import { CodeEditor, Outputs, ToolbarComponent, StatusBar } from './components';

// Styling
import './SageCell.css';

/**
 * SageCell - SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */

function AppComponent(props: App): JSX.Element {
  const { user } = useUser();
  if (!user) return <></>;

  // App state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Local state
  const [access, setAccess] = useState(true);

  // Styles
  const [editorHeight, setEditorHeight] = useState(150);
  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A'); // gray.100  gray.800

  // Kernel Store
  const { apiStatus, kernels } = useKernelStore((state) => state);
  const [selectedKernelName, setSelectedKernelName] = useState<string>('');

  useEffect(() => {
    // If the API Status is down, set the publicKernels to empty array
    if (!apiStatus) {
      setAccess(false);
      return;
    } else {
      const selectedKernel = kernels.find((kernel) => kernel.kernel_id === s.kernel);
      setSelectedKernelName(selectedKernel ? selectedKernel.alias : '');
      const isPrivate = selectedKernel?.is_private;
      const owner = selectedKernel?.owner;
      if (!isPrivate) setAccess(true);
      else if (isPrivate && owner === user?._id) setAccess(true);
      else setAccess(false);
    }
  }, [apiStatus, kernels, s.kernel, user, access]);

  /**
   * Update local state if the online status changes
   * @param {boolean} online
   */
  useEffect(() => {
    if (!apiStatus) {
      updateState(props._id, {
        streaming: false,
        kernel: '',
        msgId: '',
      });
    }
  }, [apiStatus]);

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
    setEditorHeight((prevHeight) => {
      const newHeight = prevHeight + deltaY;
      // set the minimum height of the editor to 150px
      if (newHeight < 150) return 150;
      // set the maximum height of the editor to 50% of the window height
      if (newHeight > props.data.size.height * 0.8) return props.data.size.height * 0.8;
      return newHeight;
    }); // update the Monaco editor height
  };

  useEffect(() => {
    handleEditorResize(0);
  }, [props.data.size.height]);

  return (
    <AppWindow app={props}>
      <Box className="sc" h={'calc(100% - 1px)'} w={'100%'} display="flex" flexDirection="column" backgroundColor={bgColor}>
        <StatusBar kernelName={selectedKernelName} access={access} online={apiStatus} />
        <Box
          w={'100%'}
          h={'100%'}
          display="flex"
          flex="1"
          flexDirection="column"
          whiteSpace={'pre-wrap'}
          overflowWrap="break-word"
          overflowY="auto"
          pointerEvents={access ? 'auto' : 'none'}
        >
          <CodeEditor app={props} access={access} editorHeight={editorHeight} online={apiStatus} />
          {/* The grab bar */}
          <Box
            className="grab-bar"
            onMouseDown={(e) => {
              e.preventDefault();
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
          <Box
            h={'100%'}
            width={'100%'}
            maxHeight={window.innerHeight - editorHeight - 50 + 'px'}
            overflowY={'auto'}
            css={{
              '&::-webkit-scrollbar': {
                background: 'transparent',
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'teal.300',
                borderRadius: 'md',
              },
            }}
          >
            <Outputs {...props} />
          </Box>
        </Box>
      </Box>
    </AppWindow>
  );
}

export default { AppComponent, ToolbarComponent };

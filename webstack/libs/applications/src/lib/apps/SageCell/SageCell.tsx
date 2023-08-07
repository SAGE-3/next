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
import { useUser, useHexColor, useAppStore } from '@sage3/frontend';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { App } from '../../schema';
import { CodeEditor } from './components/editor';
import { Outputs } from './components/outputs';
import { ToolbarComponent } from './components/toolbar';
import { StatusBar } from './components/status';

import './SageCell.css';
import { pingServer, fetchKernels } from './useKernelUtils';
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
  // sage state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  // local state
  const [online, setOnline] = useState(true);
  // const baseURL = `${window.location.protocol}//${window.location.hostname}:81`;
  const [access, setAccess] = useState(true);
  // styles
  const [editorHeight, setEditorHeight] = useState(150); // not beign used?
  const bgColor = useColorModeValue('#E8E8E8', '#1A1A1A');
  const accessDeniedColor = '#EE4B2B';
  const green = useHexColor('green');
  // const [selected, setSelected] = useState<KernelInfo | undefined>(s.kernels?.find((kernel) => kernel.kernel_id === s.kernel));

  /**
   * Initialize the app state
   */
  useEffect(() => {
    pingServer().then((online) => {
      if (online !== s.online) {
        updateState(props._id, { online });
      }
      fetchKernels().then((kernels) => {
        if (kernels !== s.kernels) {
          updateState(props._id, { kernels });
        }
        const selectedKernel = kernels.find((kernel) => kernel.kernel_id === s.kernel);
        setAccess(selectedKernel && selectedKernel.is_private ? selectedKernel.owner === user?._id : false);
      });
    });
    if (s.kernel === '' && s.kernels?.length > 0) {
      const firstPublicKernel = s.kernels?.find((kernel) => !kernel.is_private);
      if (firstPublicKernel) {
        updateState(props._id, { kernel: firstPublicKernel.kernel_id });
      }
    }
  }, []);

  function refreshState() {
    pingServer().then((online) => {
      if (online !== s.online) {
        updateState(props._id, { online });
      }
      fetchKernels().then((kernels) => {
        if (kernels !== s.kernels) {
          updateState(props._id, { kernels });
        }
        const selectedKernel = kernels.find((kernel) => kernel.kernel_id === s.kernel);
        setAccess(selectedKernel && selectedKernel.is_private ? selectedKernel.owner === user?._id : false);
      });
    });
    if (s.kernel === '' && s.kernels?.length > 0) {
      const firstPublicKernel = s.kernels?.find((kernel) => !kernel.is_private);
      if (firstPublicKernel) {
        updateState(props._id, { kernel: firstPublicKernel.kernel_id });
      }
    }
  }

  /**
   * Update local state if the online status changes
   * @param {boolean} online
   */
  useEffect(() => {
    if (online !== s.online) {
      setOnline(s.online);
    }
    if (!s.online) {
      updateState(props._id, {
        streaming: false,
        kernel: '',
        kernels: [],
        msgId: '',
      });
    }
  }, [s.online, online]);

  // useEffect(() => {
  //   const selectedKernel = s.kernels?.find((kernel) => kernel.kernel_id === s.kernel);
  //   setAccess(selectedKernel && selectedKernel.is_private ? selectedKernel.owner === user?._id : false);
  // }, [s.kernel, s.kernels]);

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
      <VStack w={'100%'} h={'100%'} bg={bgColor} fontSize={s.fontSize + 'px'} overflowY={'auto'} onClick={() => refreshState()}>
        <Box w={'100%'} borderBottom={`5px solid ${access ? green : accessDeniedColor}`}>
          <StatusBar kernel={s.kernel} access={access} online={online} />
        </Box>
        <Box w={'100%'} display="flex" flexDirection="column" whiteSpace={'pre-wrap'}>
          <CodeEditor app={props} access={access} editorHeight={editorHeight} online={online} />
          {/* The grab bar */}
          <Box
            className="grab-bar"
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

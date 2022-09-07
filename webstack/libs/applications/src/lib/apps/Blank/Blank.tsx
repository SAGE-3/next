/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {useAppStore, useUIStore} from '@sage3/frontend';
import {Box, Button, IconButton} from '@chakra-ui/react';
import {App} from '../../schema';

import {state as AppState} from './index';
import {AppWindow} from '../../components';
import {useEffect, useState} from "react";
import {BsFillTriangleFill} from "react-icons/bs";

type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const zindex = useUIStore((state) => state.zIndex);
  const resetZIndex = useUIStore((state) => state.resetZIndex);

  useEffect(() => {
    resetZIndex()
  }, [])

  return (
    <AppWindow app={props}>
      <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
        <p>
          x position {props.data.position.x}<br/>
          y position {props.data.position.y}<br/>
          z index {zindex}
        </p>
      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
      <IconButton
        aria-label="Dummy icon"
        icon={<BsFillTriangleFill/>}
        _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
      />
    </>
)
  ;
}

export default {AppComponent, ToolbarComponent};

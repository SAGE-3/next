/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { Box, Button, ButtonGroup, Text, Tooltip } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { MdAdd, MdRefresh, MdRemove } from 'react-icons/md';

type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

function add(update: UpdateFunc, s: AppState, id: string) {
  update(id, { count: s.count + 1 });
}

function sub(update: UpdateFunc, s: AppState, id: string) {
  update(id, { count: s.count - 1 });
}

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  return (
    <AppWindow app={props}>
      <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="5xl">Count: {s.count}</Text>
      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  function handleAddClick() {
    add(updateState, s, props._id);
  }

  function handleSubClick() {
    sub(updateState, s, props._id);
  }

  function handleReset() {
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'reset_to_zero',
        params: {},
      },
    });
  }

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Count'} openDelay={400}>
          <Button onClick={handleSubClick} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} colorScheme="red">
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Count'} openDelay={400}>
          <Button onClick={handleAddClick} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdAdd />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Reset to Zero'} openDelay={400}>
          <Button onClick={handleReset} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} colorScheme="blue">
            <MdRefresh />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

export default { AppComponent, ToolbarComponent };

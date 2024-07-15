/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
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
    updateState(props._id, { count: 0 });
  }

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Count'} openDelay={400}>
          <Button onClick={handleSubClick} colorScheme="red">
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Count'} openDelay={400}>
          <Button onClick={handleAddClick}>
            <MdAdd />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Reset to Zero'} openDelay={400}>
          <Button onClick={handleReset} colorScheme="blue">
            <MdRefresh />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

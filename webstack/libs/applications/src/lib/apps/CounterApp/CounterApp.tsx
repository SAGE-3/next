/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { Button } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

function add(update: UpdateFunc, s: AppState, id: string) {
  update(id, { count: s.count + 1 });
}

function sub(update: UpdateFunc, s: AppState, id: string) {
  update(id, { count: s.count - 1 });
}

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  function handleAddClick() {
    add(updateState, s, props._id);
  }

  function handleSubClick() {
    sub(updateState, s, props._id);
  }

  function handleZero() {
    updateState(props._id, { executeInfo: { executeFunc: 'reset_to_zero', params: {} } });
  }

  return (
    <AppWindow app={props}>
      <>
        <h1>Count: {s.count}</h1>
        <Button onClick={handleAddClick} colorScheme="green">
          Add
        </Button>
        <Button onClick={handleSubClick} colorScheme="red">
          Sub
        </Button>
        <Button onClick={handleZero} colorScheme="blue">
          Zero
        </Button>
        <h2>Last update by: {props._updatedBy}</h2>
      </>
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

  return (
    <>
      <Button onClick={handleAddClick} colorScheme="green">Add</Button>
      <Button onClick={handleSubClick} colorScheme="red">Sub</Button>
    </>
  )
}


export default { AppComponent, ToolbarComponent };

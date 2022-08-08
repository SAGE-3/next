/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Button, Text, VStack } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow, BaseOperator } from '../../components';

// Operator for the Counter application
import { useOperator } from './operator';

/**
 * Operator class for the CounterApp app
 * 
 * @class Operator
 * @extends {BaseOperator<AppState>}
 */
export class Operator extends BaseOperator<AppState> {

  add(s: AppState) {
    this.update({ count: s.count + 1 });
  }

  sub(s: AppState) {
    this.update({ count: s.count - 1 });
  }

  zero() {
    this.update({ executeInfo: { executeFunc: 'reset_to_zero', params: {} } });
  }

}


/**
 * Application component for the Counter application.
 *
 * @param {App} props 
 * @returns {JSX.Element} 
 */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updater = useOperator(props._id);

  return (
    <AppWindow app={props}>
      <VStack>
        <Text fontSize={"3xl"}>Count: {s.count}</Text>
        <Button w={200} onClick={() => (updater.add(s))} colorScheme="green" mx={2}>
          Add
        </Button>
        <Button w={200} onClick={() => (updater.sub(s))} colorScheme="red" mx={2}>
          Sub
        </Button>
        <Button w={200} onClick={() => (updater.zero())} colorScheme="blue" mx={2}>
          Zero
        </Button>
        <Text fontSize={"xl"}>Last update by:</Text>
        <Text fontSize={"sm"}>{props._updatedBy}</Text>
      </VStack>
    </AppWindow>
  );
}

/**
 * UI component for the CounterApp app
 *
 * @param {App} props 
 * @returns {JSX.Element} 
 */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updater = useOperator(props._id);

  return (
    <>
      <Button onClick={() => (updater.add(s))} colorScheme="green" mx={2}>Add</Button>
      <Button onClick={() => (updater.sub(s))} colorScheme="red" mx={2}>Sub</Button>
    </>
  )
}


export default { AppComponent, ToolbarComponent };

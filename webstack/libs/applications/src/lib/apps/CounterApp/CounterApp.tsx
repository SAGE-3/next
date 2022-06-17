/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { Button } from '@chakra-ui/react';
import { AppSchema } from "../../schema";

import { state as AppState } from "./index";
import { AppWindow } from '../../components';

function CounterApp(props: AppSchema): JSX.Element {

  const s = props.state as AppState;

  const updateState = useAppStore(state => state.updateState);


  function handleAddClick() {
    updateState(props.id, { count: s.count + 1 })
  }

  function handleSubClick() {
    updateState(props.id, { count: s.count - 1 })
  }

  return (
    <AppWindow app={props}>
      <>
        <h1>Count: {s.count}</h1>
        <Button onClick={handleAddClick} colorScheme="green">Add</Button>
        <Button onClick={handleSubClick} colorScheme="red">Sub</Button>
      </>
    </AppWindow >
  )
}

export default CounterApp;
/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { useAppStore } from '@sage3/frontend';
import { Button } from '@chakra-ui/react';
import { AppSchema } from "../types";

import { CounterState } from "./index";
import './styles.css';

function CounterApp(props: AppSchema): JSX.Element {

  const s = props.state as CounterState;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.delete);

  function handleAddClick() {
    updateState(props.id, { count: s.count + 1 })
  }

  function handleSubClick() {
    updateState(props.id, { count: s.count - 1 })
  }

  function handleClose() {
    deleteApp(props.id);
  }

  return (
    <div className="Counter-Container">
      <h3>{props.name} - {s.count} <button onClick={handleClose}>X</button></h3>
      <Button onClick={handleAddClick} colorScheme="green">Add</Button>
      <Button onClick={handleSubClick} colorScheme="red">Sub</Button>
    </div>
  )
}

export default CounterApp;
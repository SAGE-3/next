/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { useAppStore } from '@sage3/frontend';
import { AppSchema } from "../../schema/app";

import { CounterState } from "./index";
import './styles.css';

export function CounterApp(props: AppSchema): JSX.Element {

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
      <h3>{props.name} - <button onClick={handleClose}>X</button></h3>
      <p>{s.count}</p>
      <button onClick={handleAddClick}>Add</button>
      <button onClick={handleSubClick}>Sub</button>
    </div>
  )
}
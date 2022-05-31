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

import { LinkerState } from "./";
import './styles.css';


export function LinkerApp(props: AppSchema): JSX.Element {

  const s = props.state as LinkerState;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.delete);
  // useEffect(() => {
  //   const newValue = s[s.fromAppField];
  // }, [s])

  function handleClose() {
    deleteApp(props.id);
  }

  return (
    <div className="Linker-Container">
      <h3>{props.name} - <button onClick={handleClose}>X</button></h3>
      <p>{s.fromAppId} - {s.toAppId} </p>
      <p>{s.fromAppField} - {s.toAppField}</p>
    </div>
  )
}
/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { AppSchema } from "../schema";

import { state as AppState } from "./";
import './styles.css';


function LinkerApp(props: AppSchema): JSX.Element {

  const s = props.state as AppState;

  const updateState = useAppStore(state => state.updateState);
  // useEffect(() => {
  //   const newValue = s[s.fromAppField];
  // }, [s])



  return (
    <div className="Linker-Container">
      <h3>{props.name} </h3>
      <p>{s.fromAppId} - {s.toAppId} </p>
      <p>{s.fromAppField} - {s.toAppField}</p>
    </div>
  )
}

export default LinkerApp;
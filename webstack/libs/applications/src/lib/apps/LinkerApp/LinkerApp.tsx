/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { AppWindow } from '../../components';
import { App } from "../../schema";

import { state as AppState } from "./";

function LinkerApp(props: App): JSX.Element {

  const s = props.data.state as AppState;

  const updateState = useAppStore(state => state.updateState);
  // useEffect(() => {
  //   const newValue = s[s.fromAppField];
  // }, [s])



  return (
    <AppWindow app={props}>
      <>
        <p>{s.fromAppId} - {s.toAppId} </p>
        <p>{s.fromAppField} - {s.toAppField}</p>
      </>
    </AppWindow>
  )
}

export default LinkerApp;
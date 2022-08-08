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


function AppComponent(props: App): JSX.Element {

  const s = props.data.state as AppState;

  const updateState = useAppStore(state => state.updateState);

  function handleSliderChange(event: React.ChangeEvent<HTMLInputElement>) {
    updateState(props._id, { value: Number(event.target.value) })
  }

  function resetTo33(event: React.MouseEvent<HTMLButtonElement>){
    console.log("I am here");
    updateState(props._id, { executeInfo: { executeFunc: 'set_to_val', params: {val:33 } } });
  }

  return (
    <AppWindow app={props}>
      <>
        <h3>{props.data.name} </h3>
        <h3>{s.value}</h3>
        <input type="range" min="1" max="100" value={s.value} onChange={handleSliderChange} />
        <br/>
        <button type="button" onClick={resetTo33}>reset to 33!</button>
      </>
    </AppWindow>
  )
}
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  return (
    <>
    </>
  )
}

export default { AppComponent, ToolbarComponent };

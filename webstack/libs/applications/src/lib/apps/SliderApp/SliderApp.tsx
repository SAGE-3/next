/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { AppWindow } from '../../components';
import { AppSchema } from "../../schema";

import { state as AppState } from "./";


function SliderApp(props: AppSchema): JSX.Element {

  const s = props.state as AppState;

  const updateState = useAppStore(state => state.updateState);

  function handleSliderChange(event: React.ChangeEvent<HTMLInputElement>) {
    updateState(props.id, { value: Number(event.target.value) })
  }



  return (
    <AppWindow app={props}>
      <>
        <h3>{props.name} </h3>
        <h3>{s.value}</h3>
        <input type="range" min="1" max="100" value={s.value} onChange={handleSliderChange} />
      </>
    </AppWindow>
  )
}

export default SliderApp;
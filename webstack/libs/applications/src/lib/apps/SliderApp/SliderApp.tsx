/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { SBDocument } from '@sage3/sagebase';
import { AppWindow } from '../../components';
import { AppSchema } from "../../schema";

import { state as AppState } from "./";


function SliderApp(props: SBDocument<AppSchema>): JSX.Element {

  const s = props.data.state as AppState;

  const updateState = useAppStore(state => state.updateState);

  function handleSliderChange(event: React.ChangeEvent<HTMLInputElement>) {
    updateState(props._id, { value: Number(event.target.value) })
  }

  return (
    <AppWindow app={props}>
      <>
        <h3>{props.data.name} </h3>
        <h3>{s.value}</h3>
        <input type="range" min="1" max="100" value={s.value} onChange={handleSliderChange} />
      </>
    </AppWindow>
  )
}

export default SliderApp;
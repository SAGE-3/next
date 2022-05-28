/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppSchema, SliderState } from "@sage3/shared/types";
import { useAppStore } from "../../stores/app";

import './styles.css';


export function SliderApp(props: AppSchema): JSX.Element {

  const s = props.state as SliderState;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.delete);

  function handleSliderChange(event: React.ChangeEvent<HTMLInputElement>) {
    updateState(props.id, { value: Number(event.target.value) })
  }

  function handleClose() {
    deleteApp(props.id);
  }

  return (
    <div className="Slider-Container">
      <h3>{props.name} - <button onClick={handleClose}>X</button></h3>
      <h3>{s.value}</h3>
      <input type="range" min="1" max="100" value={s.value} onChange={handleSliderChange} />
    </div>
  )
}
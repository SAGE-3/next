import React from "react";
import { State } from ".";
import { AppSchema } from "..";
import { useAppStore } from "../../store/AppPlaygroundStore";

import './styles.css';


export function SliderApp(props: AppSchema): JSX.Element {

  const s = props.state as State;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.deleteApp);

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
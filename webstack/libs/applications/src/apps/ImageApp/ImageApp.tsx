import React from "react";
import { State } from ".";
import { AppSchema } from "..";
import { useAppStore } from "../../store/AppPlaygroundStore";
import './styles.css';

export function ImageApp(props: AppSchema): JSX.Element {

  const s = props.state as State;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.deleteApp);

  function handleTextChange(ev: any) {
    updateState(props.id, { url: ev.target.value })
  }

  function handleClose() {
    deleteApp(props.id);
  }

  return (
    <div className="Image-Container">
      <h3>{props.name} - <button onClick={handleClose}>X</button></h3>
      <p>URL:</p>
      <input type="text" onChange={handleTextChange} />
      <hr />
      <img src={s.url} width="200px" alt={"ImageApp"}></img>
    </div>
  )
}
import React from "react";
import { State } from ".";
import { AppSchema } from "..";
import { useAppStore } from "../../store/AppPlaygroundStore";

import './styles.css';


export function CounterApp(props: AppSchema): JSX.Element {

  const s = props.state as State;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.deleteApp);

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
import React, { useEffect } from "react";
import { State } from ".";
import { AppSchema } from "..";
import { useAppStore } from "../../store/AppPlaygroundStore";

import './styles.css';


export function LinkerApp(props: AppSchema): JSX.Element {

  const s = props.state as State;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.deleteApp);
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
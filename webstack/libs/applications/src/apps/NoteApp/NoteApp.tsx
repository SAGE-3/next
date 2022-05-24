import React from "react";
import { State } from ".";
import { AppSchema } from "..";
import { useAppStore } from "../../store/AppPlaygroundStore";
import './styles.css';

export function NoteApp(props: AppSchema): JSX.Element {

  const s = props.state as State;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.deleteApp);

  function handleTextChange(ev: React.ChangeEvent<HTMLTextAreaElement>) {
    updateState(props.id, { text: ev.target.value })
  }

  function handleClose() {
    deleteApp(props.id);
  }

  return (
    <div className="Note-Container">
      <h3>{props.name} - <button onClick={handleClose}>X</button></h3>
      <textarea id="story" name="story" onChange={handleTextChange}>
        {s.text}
      </textarea>
    </div>
  )
}
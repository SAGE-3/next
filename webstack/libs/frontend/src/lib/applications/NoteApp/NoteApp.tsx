/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppSchema, NoteState } from "@sage3/shared/types";
import { useAppStore } from "../../stores/app-store";

import './styles.css';

export function NoteApp(props: AppSchema): JSX.Element {

  const s = props.state as NoteState;

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
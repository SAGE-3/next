/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */


import { useAppStore } from '@sage3/frontend';
import { AppSchema } from "../schema";

import { state as AppState } from "./";
import './styles.css';

function NoteApp(props: AppSchema): JSX.Element {

  const s = props.state as AppState;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.delete);

  function handleTextChange(ev: React.ChangeEvent<HTMLTextAreaElement>) {
    updateState(props.id, { text: ev.target.value })
  }

  function handleClose() {
    deleteApp(props.id);
  }

  return (
    <div className="Note-Container">
      <h3>{props.name} - <button onClick={handleClose}>X</button></h3>
      <textarea value={s.text} onChange={handleTextChange}>
        {s.text}
      </textarea>
    </div>
  )
}

export default NoteApp;
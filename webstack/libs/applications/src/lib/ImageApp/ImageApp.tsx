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

function ImageApp(props: AppSchema): JSX.Element {

  const s = props.state as AppState;

  const updateState = useAppStore(state => state.updateState);

  function handleTextChange(ev: React.ChangeEvent<HTMLInputElement>) {
    updateState(props.id, { url: ev.target.value })
  }

  return (
    <div className="Image-Container">
      <h3>{props.name} </h3>
      <p>URL:</p>
      <input type="text" onChange={handleTextChange} />
      <hr />
      <img src={s.url} crossOrigin="anonymous" width="200px" alt={"ImageApp"}></img>
    </div>
  )
}

export default ImageApp;
/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { useAppStore } from '@sage3/frontend';
import { AppSchema } from "../../schema/app";

import { ImageState } from "./";
import './styles.css';

export function ImageApp(props: AppSchema): JSX.Element {

  const s = props.state as ImageState;

  const updateState = useAppStore(state => state.updateState);
  const deleteApp = useAppStore(state => state.delete);

  function handleTextChange(ev: React.ChangeEvent<HTMLInputElement>) {
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
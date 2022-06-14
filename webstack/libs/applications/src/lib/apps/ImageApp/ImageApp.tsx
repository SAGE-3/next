/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { AppWindow } from '../../components';
import { AppSchema } from "../../schema";

import { state as AppState } from "./";

function ImageApp(props: AppSchema): JSX.Element {

  const s = props.state as AppState;

  const updateState = useAppStore(state => state.updateState);

  function handleTextChange(ev: React.ChangeEvent<HTMLInputElement>) {
    updateState(props.id, { url: ev.target.value })
  }

  return (
    <AppWindow app={props}>
      <>
        <p>URL:</p>
        <input type="text" width="2000px" onChange={handleTextChange} />
        <hr />
        <img src={s.url} crossOrigin="anonymous" height={props.size.height + 'px'} alt={"ImageApp"}></img>
      </>
    </AppWindow>
  )
}

export default ImageApp;
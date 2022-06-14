/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppWindow } from '../../components';
import { AppSchema } from "../../schema";

import { state as AppState } from "./";

function ImageApp(props: AppSchema): JSX.Element {

  const s = props.state as AppState;

  return (
    <AppWindow app={props}>
      <img src={s.url} crossOrigin="anonymous" alt={"ImageApp"}></img>
    </AppWindow>
  )
}

export default ImageApp;
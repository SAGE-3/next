/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppWindow } from '../../components';
import { App } from '../../schema';
import { state as AppState } from "./";

function ImageApp(props: App): JSX.Element {

  const s = props.data.state as AppState;

  return (
    <AppWindow app={props}>
      <img src={s.url} width="100%" crossOrigin="anonymous" alt={"ImageApp"}></img>
    </AppWindow>
  )
}

export default ImageApp;
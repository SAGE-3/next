/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

function CodeCell(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // const updateState = useAppStore((state) => state.updateState);

  return (
    <AppWindow app={props}>
      <>
        <h1> Cell</h1>
        <h2> code: {s.code}</h2>
        <h2> Execute: {s.execute.name}</h2>
        <ul>
          {Object.values(s.execute.params).map((v, i: number) => {
            // Escape hatch
            const val = v as any;
            // Extract the value
            const name = val['name'] as string;
            const value = val['val'] as any;
            return (<li key={i}>{name} : {value}</li>)
          })}
        </ul>
        <h2> Output: {s.output}</h2>
      </>
    </AppWindow>
  );
}

function CodeCellToolbar(props: App): JSX.Element {

  const s = props.data.state as AppState;

  return (
    <>
    </>
  )
}


export default { App: CodeCell, Toolbar: CodeCellToolbar };

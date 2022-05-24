/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { UUID, DataReducer } from '@sage3/shared/types';

/*
 * A cell
 */
export type PCell = {
  id: UUID;
  code: string;
  user: string;
  needrun: boolean;
  output?: string;
};

export type SnippetState = PCell[];

export type CellAction =
  | {
      type: 'create';
      id: UUID;
      code: string;
      user: string;
      needrun: false;
    }
  | {
      type: 'update';
      id: UUID;
      code: string;
    }
  | {
      type: 'output';
      id: UUID;
      output: string;
    }
  | {
      type: 'run';
      id: UUID;
    }
  | {
      type: 'clear';
    };

export const snippetsReducer: DataReducer<SnippetState, CellAction> = (prevState, action) => {
  // console.log('Got an update>', action, prevState);

  if (action.type === 'create') {
    const { type, ...content } = action;
    return [...prevState, { ...content }];
  } else if (action.type === 'update') {
    // should update the cell
    const idx = findCell(prevState, action.id);
    if (idx !== -1) {
      const old = prevState.splice(idx, 1)[0];
      old.code = action.code;
      return [...prevState, { ...old }];
    }
  } else if (action.type === 'output') {
    // new output for a cell
    // console.log('   output')
    const idx = findCell(prevState, action.id);
    if (idx !== -1) {
      const old = prevState.splice(idx, 1)[0];
      old.needrun = false;
      old.output = action.output;
      return [...prevState, { ...old }];
    }
  } else if (action.type === 'run') {
    // run cell
    const idx = findCell(prevState, action.id);
    if (idx !== -1) {
      const old = prevState.splice(idx, 1)[0];
      old.needrun = true;
      return [...prevState, { ...old }];
    }
  } else if (action.type === 'clear') {
    // Create new empty array
    return [];
  }

  return prevState;
};

function findCell(state: SnippetState, id: string) : number {
  let i = 0;
  for (const c of state) {
    if (c.id === id) {
      return i;
    }
    i++;
  }
  return -1;
}

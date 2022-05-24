/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { UUID, DataReducer } from '@sage3/shared/types';


export type CellState = {
  code: string;
};

export type CellAction =
  | {
      type: 'create';
      code: string;
    }
  | {
      type: 'update';
      code: string;
    };

export const cellReducer: DataReducer<CellState, CellAction> = (prevState, action) => {
  if (action.type === 'create') {
    // const { type, ...content } = action;
    // return [...prevState, { ...content }];
  } else if (action.type === 'update') {
    const { type, ...content } = action;
    return { ...content };
  }

  return prevState;
};

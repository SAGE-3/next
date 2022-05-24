/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { DataReducer } from '@sage3/shared/types';

/*
 * A cell
 */
export type Sagecell = {
  code: string;
  output?: string;
  needrun: boolean;
};

export type SagecellAction =
  | {
      type: 'update';
      code: string;
    }
  | {
      type: 'output';
      output: string;
    }
  | {
      type: 'run';
      code: string;
    }
  | {
      type: 'clear';
    };

export const sagecellReducer: DataReducer<Sagecell, SagecellAction> = (prevState, action) => {
  if (action.type === 'update') {
    return { ...prevState, code: action.code };
  } else if (action.type === 'output') {
    return { ...prevState, output: action.output, needrun: false };
  } else if (action.type === 'run') {
    return { ...prevState, code: action.code, needrun: true };
  } else if (action.type === 'clear') {
    return { ...prevState, code: '', output: '', needrun: false };
  }
  return prevState;
};

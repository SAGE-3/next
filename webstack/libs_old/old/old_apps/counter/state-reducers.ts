/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { DataReducer } from '@sage3/shared/types';

export type CounterState = {
  count: number;
}

export type CounterActions =
  | {
    type: 'increase';
  }
  | {
    type: 'decrease';
  }


export const counterReducer: DataReducer<CounterState, CounterActions> = (prevState, action) => {
  switch (action.type) {
    case 'increase':
      return { ...prevState, count: prevState.count + 1 };
    case 'decrease':
      return { ...prevState, count: prevState.count - 1 };
    default:
      return prevState;
  }
};

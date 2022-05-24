/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppProps } from '@sage3/shared/types';
import { counterReducer, CounterState } from './state-reducers';

export const meta = {
  name: 'CounterApp',
  description: 'An app that counts',
  showInMenu: false,
  initialSize: {
    width: 400,
    height: 400,
  },
  data: {},
  state: {
    counter1State: {
      type: 'reducer',
      initialState: {
        count: 1
      } as CounterState,
      reducer: counterReducer,
    },
    counter2State: {
      type: 'reducer',
      initialState: {
        count: 2
      } as CounterState,
      reducer: counterReducer,
    },
    counterAtomState: {
      type: 'atom',
      initialState: {
        count: 3
      } as CounterState,
    },
  }
} as const;

export type CounterProps = AppProps<typeof meta>;

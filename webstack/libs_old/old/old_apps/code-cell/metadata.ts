/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: codeCell
 * created by: Luc Renambot
 */

// Imports the builtin props for applications
import { AppProps } from '@sage3/shared/types';
import { cellReducer, CellState } from './state-reducers';

/**
 * Structure defining the application codeCell
 */
export const meta = {
  // Name of the application
  name: 'codeCell',
  description: 'Python Cell',
  showInMenu: false,
  initialSize: {
    width: 350,
    height: 350,
  },
  // Defines the state variables of the application
  data: {},
  // Defines the default values
  state: {
    cellState: {
      type: 'reducer',
      // Defines the default value
      initialState: { code: 'x = 5;\nfor i in range(x):\n\tprint(i)' } as CellState,
      reducer: cellReducer,
    },
    cellOutput: {
      type: 'atom',
      initialState: {
        value: ''
      } as { value: string }
    },
    isLocked: {
      type: 'atom',
      initialState: {
        value: true,
      } as {value: boolean}
    }
  },
} as const;

// Adding the defined structure to the application props
export type codeCellProps = AppProps<typeof meta>;

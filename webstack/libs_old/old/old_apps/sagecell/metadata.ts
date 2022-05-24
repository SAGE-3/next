/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: Sagecell
 * created by: Luc Renambot
 */

// Imports the builtin props for applications
import { AppProps } from '@sage3/shared/types';
import { sagecellReducer, Sagecell } from './state-reducer';

/**
 * Structure defining the application sagecell
 */
export const meta = {
  // Name of the application
  name: 'sagecell',
  description: 'SAGE Cell',
  showInMenu: true,
  initialSize: {
    width: 1000,
    height: 350,
  },
  // Defines the state variables of the application
  data: {
    file: '.py',
  },
  // Defines the default values
  state: {
    sagecell: {
      type: 'reducer',
      initialState: {
        code: '',
        output: '',
        needrun: false,
      } as Sagecell,
      reducer: sagecellReducer,
    },
    isLocked: {
      type: 'atom',
      initialState: {
        value: false,
      } as { value: boolean },
    },
  },
} as const;

// Adding the defined structure to the application props
export type sagecellProps = AppProps<typeof meta>;

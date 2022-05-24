/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: stickies
 * created by: Nurit Kirshenbaum
 */

// Imports the builtin props for applications
import { AppProps, smartFunctionsReducer, SmartFunctions } from '@sage3/shared/types';

export type StickyType = {
  text: string;
  color: string;
};

/**
 * Structure defining the application stickies
 */
export const meta = {
  // Name of the application
  name: 'Stickies',
  description: 'Sticky Note',
  showInMenu: true,
  initialSize: {
    width: 450,
    height: 300,
  },
  // Defines the state variables of the application
  data: {},
  // Defines the default values
  state: {
    value: { type: 'atom', initialState: { text: '', color: '#F6E05E' } as StickyType },
    smartFunctions: {
      type: 'reducer',
      initialState: { actions: {}, run: '' } as SmartFunctions,
      reducer: smartFunctionsReducer,
    },
  },
} as const;

// Adding the defined structure to the application props
export type stickiesProps = AppProps<typeof meta>;

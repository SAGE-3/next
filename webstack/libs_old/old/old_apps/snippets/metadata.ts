/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: snippets
 * created by: Luc Renambot
 */

// Imports the builtin props for applications
import { AppProps } from '@sage3/shared/types';
import { SnippetState, snippetsReducer } from './state-reducer';

/**
 * Structure defining the application snippets
 */
export const meta = {
  // Name of the application
  name: 'snippets',
  description: 'Snippets App',
  showInMenu: false,
  initialSize: {
    width: 610,
    height: 470,
  },
  // Defines the state variables of the application
  data: {},
  // Defines the default values
  state: {
    snippets: {
      type: 'reducer',
      initialState: [] as SnippetState,
      reducer: snippetsReducer,
    },
  },
} as const;

// Adding the defined structure to the application props
export type snippetsProps = AppProps<typeof meta>;

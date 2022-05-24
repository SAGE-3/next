/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: freehand
 * created by: Luc Renambot &lt;renambot@gmail.com&gt;
 */

// Imports the builtin props for applications
import { AppProps } from '@sage3/shared/types';
import { strokesReducer, StrokeState } from './state-reducers';

/**
 * Structure defining the application freehand
 */
export const meta = {
  // Name of the application
  name: 'freehand',
  description: 'Freehand Drawing',
  showInMenu: true,
  initialSize: {
    width: 610,
    height: 470,
  },
  // Defines the state variables of the application
  data: {},
  state: {
    strokes: {
      type: 'reducer',
      // Defines the default value
      initialState: [] as StrokeState,
      // State reducer for strokes
      reducer: strokesReducer,
    },
  },
  localState: {
    color: "black"
  }
} as const;

// Adding the defined structure to the application props
export type freehandProps = AppProps<typeof meta>;

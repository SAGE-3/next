/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: webview
 * created by: Dylan
 */

// Imports the builtin props for applications
import { AppProps } from '@sage3/shared/types';
import { addressReducer, AddressState, visualReducer, VisualState } from './webviewreducer';

// ---------------------------------------------------------------------------
/**
 * Structure defining the application webview
 */
export const meta = {
  // Name of the application
  name: 'webview',
  description: 'Web Browser',
  showInMenu: true,
  initialSize: {
    width: 600,
    height: 750,
  },
  data: {},
  state: {
    address: {
      type: 'reducer',
      // Defines the default value
      initialState: {
        history: ['https://sage3.sagecommons.org/'],
        historyIdx: 0,
      } as AddressState,
      // State reducer for address
      reducer: addressReducer,
    },
    visual: {
      type: 'reducer',
      // Defines the default value
      initialState: {
        zoom: 1.0, // In page zoom
        scrollX: 0,
        scrollY: 0,
      } as VisualState,
      // State reducer for visual components
      reducer: visualReducer,
    },
    local: {
      type: 'atom',
      initialState: {
        reload: false,
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------

// Adding the defined structure to the application props
export type webviewProps = AppProps<typeof meta>;

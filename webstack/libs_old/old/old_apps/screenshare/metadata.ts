/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: screenshare
 * created by: Dylan Kobayashi
 */

// Imports the builtin props for applications
import { AppProps } from '@sage3/shared/types';

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

export type ScreenshareState = {
  sourceClientId: string | null;
};
// ---------------------------------------------------------------------------
export type ScreenshareMessage = {
	appId: string,
  messageType: string;
  from: string;
  for: string;
  content: string;
};
// ---------------------------------------------------------------------------
export const SsMsgTypes = {
  SS_SOURCE: 'SS_SOURCE',
  NEW_CLIENT: 'NEW_CLIENT',
  WRTC_MSG: 'WRTC_MSG',
  WRTC_MSG_FOR_DISPLAY: 'WRTC_MSG_FOR_DISPLAY',
  WRTC_MSG_FOR_SOURCE: 'WRTC_MSG_FOR_SOURCE',
};
// ---------------------------------------------------------------------------

/**
 * Structure defining the application screenshare
 */
export const meta = {
  // Name of the application
  name: 'screenshare',
  description: 'Screen Sharing',
  showInMenu: true,
  initialSize: {
    width: 720,
    height: 405,
  },
  // Defines the state variables of the application
  data: {},
  // Defines the default values
  state: {
    webviewState: {
      type: 'atom',
      initialState: {
        sourceClientId: null,
      } as ScreenshareState,
    },
  },
} as const;

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

// Adding the defined structure to the application props
export type screenshareProps = AppProps<typeof meta>;

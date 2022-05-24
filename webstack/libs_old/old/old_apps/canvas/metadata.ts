/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: canvas
 * created by: Luc Renambot
 */

// Imports the builtin props for applications
import { AppProps } from '@sage3/shared/types';

export type positionType = {
  x: number;
  y: number;
};

/**
 * Structure defining the application canvas
 */
export const meta = {
  // Name of the application
  name: 'canvas',
  description: 'Canvas Demo',
  showInMenu: false,
  initialSize: {
    width: 350,
    height: 350,
  },
  data: {},
  // Defines the state variables of the application
  state: {
    mousePosition: {
      type: 'atom',
      // Defines the default value
      initialState: { x: 10, y: 20 } as positionType,
    },
  },
} as const;

// Adding the defined structure to the application props
export type canvasProps = AppProps<typeof meta>;

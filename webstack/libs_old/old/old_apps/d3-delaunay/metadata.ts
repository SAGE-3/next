/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: d3Delaunay
 * created by: Luc Renambot
 */

// Imports the builtin props for applications
import { AppProps } from '@sage3/shared/types';

export type positionType = {
  x: number;
  y: number;
};

/**
 * Structure defining the application d3Delaunay
 */
export const meta = {
  // Name of the application
  name: 'd3Delaunay',
  description: 'D3.js Demo',
  showInMenu: false,
  initialSize: {
    width: 535,
    height: 390,
  },
  data: {},
  // Defines the state variables of the application
  state: {
    mousePosition: {
      type: 'atom',
      initialState: { x: 10, y: 20 } as positionType,
    },
  },
} as const;

// Adding the defined structure to the application props
export type d3DelaunayProps = AppProps<typeof meta>;

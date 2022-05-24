/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: plotlyViewer
 * created by: Roderick
 */

// Imports the builtin props for applications
import { AppProps } from '@sage3/shared/types';

export type plotlyLayout = {
  width: number;
  height: number;
  title: string;
};

export type plotlyMarker = {
  color?: string;
};

export type plotlyXaxis = {
  tickangle: number;
};

export type plotlyType = {
  type: string;
  x: string[];
  y: string[];
  xaxis?: plotlyXaxis;
  mode?: string;
  marker?: plotlyMarker;
};

/**
 * Structure defining the application plotlyViewer
 */
export const meta = {
  // Name of the application
  name: 'plotlyViewer',
  description: 'Plotly Demo',
  showInMenu: false,
  initialSize: {
    width: 776,
    height: 600,
  },
  // Defines the data inputs of the application
  data: {
    file: '.json',
  },
  // Defines the state variables of the application
  state: {
    layout: {
      type: 'atom',
      initialState: { width: 350, height: 320, title: 'Default Graph', xaxis: { tickangle: -30 } } as plotlyLayout,
    },
    data: {
      type: 'atom',
      initialState: { type: 'bar', x: ['A', 'B', 'C'], y: ['1', '2', '3'] } as plotlyType,
    },
  },
} as const;

// Adding the defined structure to the application props
export type plotlyViewerProps = AppProps<typeof meta>;

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: vegaLiteViewer
 * created by: roderick
 */

// Imports the builtin props for applications
import { AppProps } from '@sage3/shared/types';

export type graphData = {
  url: string;
};

export type vegaAxis = {
  field: string;
  type: string;
};

//Color typing is optional
type colorScale = {
  range: string[];
};
type vegaColor = {
  field: string;
  scale: colorScale;
};

export type vegaEncoding = {
  x: vegaAxis;
  y: vegaAxis;
  color?: vegaColor;
};

type vegaData = {
  name: string;
};

export type vegaLiteSpecs = {
  width: number;
  height: number;
  mark: string;
  encoding: vegaEncoding;
  data: vegaData;
};

/**
 * Structure defining the application vegaLiteViewer
 */
export const meta = {
  // Name of the application
  name: 'vegaLiteViewer',
  description: 'VegaLite Demo',
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
    vegaLiteSpecs: {
      type: 'atom',
      // Defines the default values
      initialState: {
        width: 670,
        height: 480,
        mark: 'bar',
        encoding: {
          x: { field: 'Category', type: 'ordinal' } as vegaAxis,
          y: { field: 'Number', type: 'quantitative' } as vegaAxis,
        } as vegaEncoding,
        data: { name: 'table' } as vegaData, // note: vega-lite data attribute is a plain object instead of an array
      } as vegaLiteSpecs,
    },
  },
} as const;

// Adding the defined structure to the application props
export type vegaLiteViewerProps = AppProps<typeof meta>;

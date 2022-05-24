/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: plotlyViewerAlt
 * created by: Michael Rogers
 */

// Imports the builtin props for applications
import { AppProps } from '@sage3/shared/types';
import * as Plotly from 'plotly.js'

export type plotlyParams = {
  data: Plotly.Data[];
  layout: Partial<Plotly.Layout>;
  frames?: Plotly.Frame[];
  config?: Partial<Plotly.Config>;
};

/**
 * Structure defining the application plotlyViewer
 */
export const meta = {
  // Name of the application
  name: 'plotlyViewerAlt',
  description: 'Plotly Demo Two',
  showInMenu: false,
  initialSize: {
    width: 800,
    height: 600,
  },
  // Defines the data inputs of the application
  data: {
    // file: '.json',
  },
  state: {
    Figure: {
      type: 'atom',
      initialState: {
        data: [{
          x: [1,2,3,4],
          y: [1,3,2,6],
          type: 'bar',
          marker: {color: '#ab63fa'},
          name: 'Bar'
        }, {
          x: [1,2,3,4],
          y: [3,2,7,4],
          type: 'line',
          marker: {color: '#19d3f3'},
          name: 'Line'
        }],
        layout: {
            plotBackground: '#f3f6fa',
            margin: {t:0, r: 0, l: 20, b: 30},
        }
      } as plotlyParams,
    },
  }
} as const;

// Adding the defined structure to the application props
export type plotlyViewerAltProps = AppProps<typeof meta>;

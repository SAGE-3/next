/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: PlotlyViewer
 * created by: RJ
 */

export const schema = z.object({
  traces: z.any().array(),
  layout: z.any(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  traces: [
    {
      x: [1, 2, 3],
      y: [2, 6, 3],
      type: 'scatter',
      mode: 'lines+markers',
      marker: { color: 'red' },
    },
    { type: 'bar', x: [1, 2, 3], y: [2, 5, 3] },
  ],
  layout: { width: 200, height: 200, title: 'A Fancy Plot' },
};

export const name = 'PlotlyViewer';

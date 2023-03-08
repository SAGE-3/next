/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: ChartGenerator
 * created by: RJ
 */

export const schema = z.object({
  layout: z.object({
    width: z.number(),
    height: z.number(),
    title: z.string(),
    xaxis: z.any(),
    yaxis: z.any(),
  }),
  url: z.string(),
  labelName: z.string(),
  datasets: z
    .object({
      label: z.string(),
      yDataName: z.any(),
      minYValue: z.number(),
      yAxisID: z.string(),
      borderColor: z.string(),
      backgroundColor: z.string(),
      chartType: z.any(),
    })
    .array(),
  fontSizeMultiplier: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  layout: { width: 200, height: 200, title: 'A Fancy Plot', xaxis: {}, yaxis: {} },
  url: '',
  datasets: [],
  labelName: '',
  fontSizeMultiplier: 15,
};

export const name = 'ChartGenerator';

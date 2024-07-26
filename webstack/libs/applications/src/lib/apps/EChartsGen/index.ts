import { EChartsCoreOption } from 'echarts';
/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: EChartsGen
 * created by: Giorgio Tran
 */

export const schema = z.object({
  appType: z.string(),
  fileId: z.string().nullable(),
  chartSpecs: z
    .object({
      chartType: z.string(),
      attributes: z.array(z.string()).nullable(),
      visualizationElements: z.object({
        xAxis: z.string(),
        yAxis: z.string(),
        label: z.string(),
        indicator: z.string(), // for circular area chart
        value: z.string(),
        bin: z.string(), // for histogram
        count: z.string(), // for histogram
        bubbleDiameter: z.string(),
        treeMapParent: z.string(),
        treeMapChild: z.string(),
        scatterMatrixAttributes: z.array(z.string()),
      }),
    })
    .nullable(),
  model: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  appType: 'Experimental',
  fileId: null,
  chartSpecs: null,
  model: 'gpt-4',
};

export const name = 'EChartsGen';

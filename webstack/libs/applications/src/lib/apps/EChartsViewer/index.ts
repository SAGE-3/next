/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { string, z } from 'zod';
import { EChartsOption } from 'echarts';
export const EChartsOptionType: z.ZodType<EChartsOption> = z.object({});
/**
 * SAGE3 application: EChartsViewer
 * created by: RJ
 */

export const schema = z.object({
  options: EChartsOptionType,
  stationName: z.string().array(),
  chartType: z.string(),
  yAxisAttributes: z.string().array(),
  xAxisAttributes: z.string().array(),
  transform: z.any().optional(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  stationName: [],
  chartType: '',
  yAxisAttributes: [],
  xAxisAttributes: [],
  transform: [],
  options: {
    title: {
      text: 'ECharts Getting Started Example',
      textStyle: {
        fontSize: 40,
      },
    },
    tooltip: {},
    legend: {
      data: ['sales'],
      textStyle: { fontSize: 30 },
    },
    xAxis: {
      data: ['Shirts', 'Cardigans', 'Chiffons', 'Pants', 'Heels', 'Socks'],
      axisLabel: {
        fontSize: 30,
      },
    },
    yAxis: {
      axisLabel: {
        fontSize: 30,
      },
    },
    series: [
      {
        name: 'sales',
        type: 'bar',
        data: [5, 20, 36, 10, 10, 20],
      },
    ],
  },
};

export const name = 'EChartsViewer';

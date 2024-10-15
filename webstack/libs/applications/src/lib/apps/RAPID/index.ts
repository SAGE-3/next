/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { METRICS, CATEGORIES } from './data/constants';

/**
 * SAGE3 application: RAPID
 * created by: Giorgio Tran
 */

export const schema = z.object({
  liveData: z.boolean(),
  lastUpdated: z.string().nullable(),
  sensors: z.object({
    waggle: z.array(z.string()),
    mesonet: z.array(z.string()),
  }),
  category: z.string(),
  metric: z.object({
    name: z.string(),
    waggle: z.string(),
    mesonet: z.string().nullable(),
  }),
  startTime: z.date().nullable(),
  endTime: z.date().nullable(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  liveData: true,
  lastUpdated: null,
  sensors: {
    waggle: ['W097'],
    mesonet: ['004HI'],
  },
  metric: METRICS.find((m) => m.name === 'Temperature (°C)'),
  category: CATEGORIES.GRAPH,
  startTime: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
  endTime: new Date(Date.now()),
};

export const name = 'RAPID';

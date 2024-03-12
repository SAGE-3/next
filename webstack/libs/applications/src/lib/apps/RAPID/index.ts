/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { QUERY_FIELDS, CATEGORIES } from './data/constants';

/**
 * SAGE3 application: RAPID
 * created by: Giorgio Tran
 */

export const schema = z.object({
  category: z.string(),
  children: z.array(z.string()),
  counter: z.number(),
  initialized: z.boolean(),
  lastUpdated: z.string().nullable(),
  liveData: z.boolean(),
  metric: z.object({
    MESONET: z.string(),
    NAME: z.string(),
    SAGE_NODE: z.string(),
  }),
  metricData: z
    .object({
      data: z.array(
        z.object({
          'Sage Node': z.number(),
          Mesonet: z.number(),
          x: z.string(),
        })
      ),
    })
    .nullable(),
  parent: z.string(),
  time: z.object({
    MESONET: z.string(),
    SAGE_NODE: z.string(),
  }),
  unique: z.string().nullable(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  category: CATEGORIES.CONTROL_PANEL.name,
  children: [],
  counter: 10,
  initialized: false,
  lastUpdated: null,
  liveData: true,
  metric: QUERY_FIELDS.TEMPERATURE,
  metricData: null,
  parent: '',
  time: QUERY_FIELDS.TIME['24HR'],
  unique: null,
};

export const name = 'RAPID';

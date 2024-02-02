/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { CATEGORIES } from './constants';

/**
 * SAGE3 application: RAPID
 * created by: Giorgio Tran
 */

export const schema = z.object({
  initialized: z.boolean(),
  parent: z.string(),
  children: z.array(z.string()),
  category: z.string(),
  counter: z.number(),
  metricData: z
    .object({
      data: z.array(
        z.object({
          x: z.string(),
          'Sage Node': z.number(),
          Mesonet: z.number(),
        })
      ),
    })
    .nullable(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  initialized: false,
  parent: '',
  children: [],
  category: CATEGORIES.CONTROL_PANEL.name,
  counter: 10,
  metricData: null,
};

export const name = 'RAPID';

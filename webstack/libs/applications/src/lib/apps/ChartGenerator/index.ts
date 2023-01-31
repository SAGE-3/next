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
  }),
  url: z.string(),
  axis: z.object({
    x: z.string().array(),
    y: z.string().array(),
    type: z.string().array(),
    mode: z.string().array(),
  }),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  layout: { width: 200, height: 200, title: 'A Fancy Plot' },
  url: '',
  axis: { x: [''], y: [''], type: [''], mode: [''] },
};

export const name = 'ChartGenerator';

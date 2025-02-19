/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: Timer
 * created by: Loelle Lam
 */

export const schema = z.object({
  originalTotal: z.number(),
  total: z.number(),
  clientStartTime: z.number(),
  isRunning: z.boolean(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  originalTotal: 300,
  total: 300,
  clientStartTime: 0,
  isRunning: false,
};

export const name = 'Timer';

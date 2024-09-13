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
  total: z.number(),
  isRunning: z.boolean(),
  isReset: z.boolean(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  total: 300,
  isRunning: false,
  isReset: false,
};

export const name = 'Timer';

/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: counterTest
 * created by: loelle
 */

export const schema = z.object({
  count: z.number(),
  firstInput: z.number(),
  secondInput: z.number(),
  result: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  count: 0,
  firstInput: 0,
  secondInput: 0,
  result: 0,
};

export const name = 'counterTest';

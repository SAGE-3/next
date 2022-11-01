/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

/**
 * SAGE3 application: chartMaker
 * created by: RJ
 */

export const schema = z.object({
  specification: z.number(),
  input: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  specification: 42,
  input: '',
};

export const name = 'ChartMaker';

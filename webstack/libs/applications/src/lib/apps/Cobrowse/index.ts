/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

/**
 * SAGE3 application: Cobrowse
 * created by: SAGE3
 */

export const schema = z.object({
  sharedurl: z.string(),
  running: z.boolean(),
  frame: z.number(),
  title: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  sharedurl: 'https://www.google.com',
  running: false,
  frame: 0,
  title: '',
};

export const name = 'Cobrowse';

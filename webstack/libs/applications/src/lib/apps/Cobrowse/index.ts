/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: Cobrowse
 * created by: SAGE3
 */

export const schema = z.object({
  sharedurl: z.string(),
  frame: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  sharedurl: 'https://www.google.com',
  frame: 0,
};

export const name = 'Cobrowse';

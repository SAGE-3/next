/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * SAGE3 application: SageCell
 * created by: SAGE3 team
 */
import { z } from 'zod';

export const schema = z.object({
  code: z.string(),
  msgId: z.string(),
  history: z.array(z.string()),
  streaming: z.boolean(),
  language: z.string(),
  fontSize: z.number(),
  kernel: z.string(),
  session: z.string(),
});

export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  code: '',
  msgId: '',
  history: [],
  streaming: false,
  language: 'python',
  fontSize: 16,
  kernel: '',
  session: '',
};

export const name = 'SageCell';

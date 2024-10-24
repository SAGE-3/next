/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

export const schema = z.object({
  text: z.string(),
  fontSize: z.number(),
  color: z.string(),
  lock: z.boolean(),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.any(),
  }),
});
export type state = z.infer<typeof schema>;

export const init: state = {
  text: 'stickie note',
  fontSize: 24,
  color: 'yellow',
  lock: false,
  executeInfo: { executeFunc: '', params: {} },
};

export const name = 'Stickie';

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: Seer
 * created by: Mahdi
 */

export const name = 'Seer';

export const schema = z.object({
  availableKernels: z.array(
    z.object({
      key: z.string(),
      value: z.record(z.string(), z.any()),
    })
  ),
  code: z.string(),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
  execCount: z.number(),
  fontSize: z.number(),
  isTyping: z.boolean(),
  kernel: z.string(),
  output: z.string(),
  prompt: z.string(),
});

export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  availableKernels: [],
  code: '',
  executeInfo: { executeFunc: '', params: {} },
  execCount: 0,
  fontSize: 16,
  isTyping: false,
  kernel: '',
  output: '',
  prompt: '',
};

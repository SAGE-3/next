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

export const schema = z.object({
  fontSize: z.number(),
  execCount: z.number(),
  prompt: z.string(),
  code: z.string(),
  output: z.string(),
  kernel: z.string(),
  kernels: z.array(
    z.object({
      key: z.string(),
      value: z.record(z.string(), z.any()),
    })
  ),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});

// export type executeInfoType = z.infer<typeof executeInfoSchema>;
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  prompt: '',
  code: '',
  output: '',
  kernel: '',
  kernels: [],
  executeInfo: { executeFunc: '', params: {} },
  fontSize: 24,
};

export const name = 'Seer';

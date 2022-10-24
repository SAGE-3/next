/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: SageCell
 * created by: SAGE3 team
 */
import { z } from 'zod';

const executeInfoSchema = z.object({
  executeFunc: z.string(),
  params: z.record(z.any()),
});

export const schema = z.object({
  code: z.string(),
  language: z.string(),
  fontSize: z.number(),
  theme: z.string(),
  kernel: z.string(),
  // kernels: z.array(
  //   z.object({
  //     id: z.string(),
  //     name: z.string(),
  //     last_activity: z.string(),
  //     execution_state: z.string(),
  //     connections: z.boolean(),
  //   })
  // ),
  // privateMessage: z.string(),
  privateMessage: z.array(
    z.object({
      userId: z.string(),
      message: z.string(),
    })
  ),
  availableKernels: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ),
  // sessions: z.array(
  //   z.object({
  //     id: z.string(),
  //     path: z.string(),
  //     name: z.string(),
  //     type: z.string(),
  //     kernel: z.object({
  //       id: z.string(),
  //       name: z.string(),
  //       last_activity: z.string(),
  //       execution_state: z.string(),
  //       connections: z.boolean(),
  //     }),
  //     notebook: z.object({
  //       id: z.string(),
  //       name: z.string(),
  //     }),
  //   })
  // ),
  output: z.string(),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});

export type executeInfoType = z.infer<typeof executeInfoSchema>;
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  code: '',
  language: 'python',
  fontSize: 24,
  theme: 'xcode',
  kernel: '',
  output: '',
  privateMessage: [],
  availableKernels: [],
  // kernels: [],
  // sessions: [],
  executeInfo: { executeFunc: '', params: {} } as executeInfoType,
};

export const name = 'SageCell';

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

const executeInfoSchema = z.object({
  executeFunc: z.string(),
  params: z.any(),
});

export const schema = z.object({
  code: z.string(),
  language: z.string(),
  fontSize: z.number(),
  theme: z.string(),
  kernel: z.string(),
  privateMessage: z.array(
    z.object({
      userId: z.string(),
      message: z.string(),
    })
  ),
  availableKernels: z.array(
    z.object({
      key: z.string(),
      value: z.any(),
    })
  ),
  output: z.string(),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.any(),
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
  executeInfo: { executeFunc: '', params: {} } as executeInfoType,
};

export const name = 'SageCell';

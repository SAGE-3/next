/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * SAGE3 application: CodeCell
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
  output: z.string(),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});

export type executeInfoType = z.infer<typeof executeInfoSchema>;
export type state = z.infer<typeof schema>;

export const init: state = {
  code: '',
  language: 'python',
  fontSize: 1,
  theme: 'xcode',
  kernel: '',
  output: '',
  executeInfo: { executeFunc: '', params: {} } as executeInfoType,
};

export const name = 'CodeCell';

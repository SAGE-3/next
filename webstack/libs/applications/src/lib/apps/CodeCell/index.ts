/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
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
  output: z.string(),
  kernel: z.string(),
  // outputs: z.record(z.any()),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});

export type executeInfoType = z.infer<typeof executeInfoSchema>;
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  code: '',
  output: '',
  kernel: '',
  // outputs: {},
  executeInfo: { executeFunc: '', params: {} } as executeInfoType,
};

export const name = 'CodeCell';

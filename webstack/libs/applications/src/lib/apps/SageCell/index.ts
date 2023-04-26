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

const outputSchema = z.object({
  request_id: z.string(),
  msg_count: z.number(),
  execute_result: z.object({
    data: z.record(z.any()),
    metadata: z.record(z.any()),
    execution_count: z.number(),
  }),
  display_data: z.object({
    data: z.record(z.any()),
    metadata: z.record(z.any()),
  }),
  stream: z.object({
    name: z.string(),
    text: z.string(),
  }),
  error: z.object({
    ename: z.string(),
    evalue: z.string(),
    traceback: z.array(z.string()),
  }),
});

const executeInfoSchema = z.object({
  executeFunc: z.string(),
  params: z.any(),
});

const availableKernelsSchema = z.array(
  z.object({
    key: z.string(),
    value: z.any(),
  })
);

export const schema = z.object({
  code: z.string(),
  summary: z.string(),
  notebookUrl: z.string(),
  cellNumber: z.number(),
  language: z.string(),
  isTyping: z.boolean(),
  fontSize: z.number(),
  theme: z.string(),
  kernel: z.string(),
  availableKernels: availableKernelsSchema,
  output: z.string(),
  msgCount: z.number(),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.any(),
  }),
});

export type ExecuteInfo = z.infer<typeof executeInfoSchema>;
export type Kernels = z.infer<typeof availableKernelsSchema>;
export type Output = z.infer<typeof outputSchema>;
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  code: '',
  summary: '',
  notebookUrl: '',
  cellNumber: 0,
  language: 'python',
  isTyping: false,
  fontSize: 16,
  theme: 'vs-dark',
  kernel: '',
  output: '',
  availableKernels: [],
  executeInfo: { executeFunc: '', params: {} } as ExecuteInfo,
};

export const name = 'SageCell';

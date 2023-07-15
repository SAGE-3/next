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

const KernelSchema = z.object({
  key: z.string(),
  value: z.object({
    board: z.string(),
    kernel: z.string(),
    kernel_name: z.string(),
    kernel_alias: z.string(),
    is_private: z.boolean(),
    owner_uuid: z.string(),
  }),
});

const availableKernelsSchema = z.array(KernelSchema);

const privateMessageSchema = z.array(
  z.object({
    userId: z.string(),
    message: z.string(),
  })
);

export const schema = z.object({
  code: z.string(),
  output: z.string(),
  language: z.string(),
  isTyping: z.boolean(),
  fontSize: z.number(),
  theme: z.string(),
  kernel: z.string(),
  privateMessage: privateMessageSchema,
  availableKernels: availableKernelsSchema,
  executeInfo: executeInfoSchema,
});

export type executeInfoType = z.infer<typeof executeInfoSchema>;
export type availableKernelsType = z.infer<typeof availableKernelsSchema>;
export type privateMessageType = z.infer<typeof privateMessageSchema>;
export type KernelType = z.infer<typeof KernelSchema>;
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  code: '',
  language: 'python',
  fontSize: 16,
  theme: 'vs-dark',
  kernel: '',
  output: '',
  privateMessage: [],
  availableKernels: [],
  executeInfo: { executeFunc: '', params: {} } as executeInfoType,
};

export const name = 'SageCell';

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: KernelDashboard
 * created by: SAGE3 Team
 */

export const kernelInfo = z.object({
  kernel_id: z.string(),
  room: z.string(),
  board: z.string(),
  name: z.string(),
  alias: z.string(),
  is_private: z.boolean(),
  owner: z.string(),
});

export type KernelInfo = z.infer<typeof kernelInfo>;

export const schema = z.object({
  kernelSpecs: z.array(z.string()),
  kernels: z.array(kernelInfo),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.any(),
  }),
  online: z.boolean(),
});

export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  kernelSpecs: ['python3'],
  kernels: [],
  executeInfo: { executeFunc: '', params: {} },
  online: false,
};

export const name = 'KernelDashboard';

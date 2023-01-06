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

export const schema = z.object({
  kernelSpecs: z.array(z.string()),
  availableKernels: z.array(
    z.object({
      key: z.string(),
      value: z.record(z.string(), z.any()),
    })
  ),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
  lastHeartBeat: z.number(),
  online: z.boolean(),
});

export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  kernelSpecs: [],
  availableKernels: [],
  executeInfo: { executeFunc: '', params: {} },
  online: false,
  lastHeartBeat: 0,
};

export const name = 'KernelDashboard';

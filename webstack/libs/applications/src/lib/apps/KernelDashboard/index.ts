/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

/**
 * SAGE3 application: KernelDashboard
 * created by: SAGE3 Team
 */

export type KernelSpec = {
  name: string;
  spec: {
    argv: string[];
    env: {
      [key: string]: string;
    };
    display_name: string;
    language: string;
    interrupt_mode: string;
    metadata: {
      [key: string]: string;
    };
  };
  resources: {
    [key: string]: string;
  };
};

export type KernelSpecs = [KernelSpec];

export const schema = z.object({
  kernelSpecs: z.array(
    z.object({
      name: z.string(),
      spec: z.object({
        argv: z.array(z.string()),
        env: z.record(z.string(), z.string()),
        display_name: z.string(),
        language: z.string(),
        interrupt_mode: z.string(),
        metadata: z.record(z.string(), z.string()),
      }),
      resources: z.record(z.string(), z.string()),
    })
  ),
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
});

export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  kernelSpecs: [],
  availableKernels: [],
  executeInfo: { executeFunc: '', params: {} },
};

export const name = 'KernelDashboard';

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

export const schema = z.object({
  hostedApps: z.record(z.string(), z.string()),

  supportedApps: z.record(z.string()),
  runStatus: z.boolean(),

  supported_tasks: z.object({
    models: z.record(z.string()),
    tasks: z.record(z.string()),
  }),


  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  executeInfo: { executeFunc: '', params: {} },
  hostedApps: {},
  supportedApps: {},
  runStatus: false,
};

export const name = 'AIPane';

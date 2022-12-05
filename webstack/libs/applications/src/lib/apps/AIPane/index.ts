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

  runStatus: z.number(),

  // Tasks supported by available models for currently hosted apps
  supportedTasks: z.record(z.string(), z.record(z.string(), z.any())),

  messages: z.record(z.string(), z.any()),

  // lastHeartBeat: z.number(),

  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});

export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  executeInfo: { executeFunc: '', params: {} },
  hostedApps: {},
  runStatus: 0,

  supportedTasks: {},
  messages: {},
  // lastHeartBeat: 0,
};

export const name = 'AIPane';

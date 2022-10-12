/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {z} from 'zod';

const VisionTasks = z.enum(["Object Detection", "Classification"]);
export type VisionTasks = z.infer<typeof VisionTasks>;

const NLPTasks = z.enum(["Summarization"]);
export type NLPTasks = z.infer<typeof NLPTasks>;

// export type supported_tasks = z.infer<(typeof VisionTasks) & (typeof NLPTasks)>;
export const supported_tasks = {...VisionTasks, ...NLPTasks};
export type supported_tasks = typeof supported_tasks;

export const schema = z.object({
  hostedApps: z.record(z.string(), z.string()),

  // supportedApps: z.record(z.string()),

  // Temp variable to demonstrate app run and idle status
  runStatus: z.boolean(),

  supported_tasks: z.record(z.string(), z.any()),

  messages: z.record(z.string(), z.any()),

  output: z.any(),

  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),

});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  executeInfo: {executeFunc: '', params: {}},
  hostedApps: {},
  runStatus: false,
  supported_tasks: {},
  messages: {},
  output: "",

};

export const name = 'AIPane';

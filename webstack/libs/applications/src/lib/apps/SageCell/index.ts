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
import { kernelInfo, KernelInfo } from '../KernelDashboard';

const executeInfoSchema = z.object({
  executeFunc: z.string(),
  params: z.any(),
});

const ContentItemSchema = z
  .object({
    stdout: z.string().optional(),
    stderr: z.string().optional(),
    traceback: z.array(z.string()).optional(),
    ename: z.string().optional(),
    evalue: z.string().optional(),
    'text/plain': z.string().optional(),
    'application/javascript': z.string().optional(),
    'text/html': z.string().optional(),
    'text/latex': z.string().optional(),
    'image/jpeg': z.string().optional(),
    'text/markdown': z.string().optional(),
    'image/png': z.string().optional(),
    'image/svg+xml': z.string().optional(),
    'application/vnd.plotly.v1+json': z.string().optional(),
    'application/vnd.vega.v5+json': z.string().optional(),
    'application/vnd.vegalite.v4+json': z.string().optional(),
    'application/vnd.vega.v4+json': z.string().optional(),
    'application/vnd.vegalite.v3+json': z.string().optional(),
    'application/vnd.vega.v3+json': z.string().optional(),
    'application/vnd.vegalite.v2+json': z.string().optional(),
    'application/vnd.vega.v2+json': z.string().optional(),
    'application/vnd.vegalite.v1+json': z.string().optional(),
    'application/vnd.vega.v1+json': z.string().optional(),
  })
  .catchall(z.string());

export const schema = z.object({
  code: z.string(),
  msgId: z.string(),
  history: z.array(z.string()),
  streaming: z.boolean(),
  language: z.string(),
  fontSize: z.number(),
  kernel: z.string(),
  session: z.string(),
  online: z.boolean(),
  kernels: z.array(kernelInfo),
  executeInfo: executeInfoSchema,
});

export type executeInfoType = z.infer<typeof executeInfoSchema>;
export type ContentItemType = z.infer<typeof ContentItemSchema>;
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  code: '',
  msgId: '',
  history: [],
  streaming: false,
  language: 'python',
  fontSize: 16,
  kernel: '',
  session: '',
  online: false,
  kernels: [] as KernelInfo[],
  executeInfo: { executeFunc: '', params: {} } as executeInfoType,
};

export const name = 'SageCell';

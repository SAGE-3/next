/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

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

const ExecOutputSchema = z.object({
  completed: z.boolean(),
  content: z.array(ContentItemSchema),
  end_time: z.string().optional(),
  execution_count: z.number(),
  last_update_time: z.string().optional(),
  msg_type: z.string().optional(),
  session_id: z.string(),
  start_time: z.string(),
});

export type ExecOutput = z.infer<typeof ExecOutputSchema>;
export type ContentItem = z.infer<typeof ContentItemSchema>;

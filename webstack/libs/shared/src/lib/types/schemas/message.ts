/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

/**
 * SAGE3 MessageSchema
 * @interface MessageSchema
 */
const schema = z.object({
  type: z.string(),
  payload: z.string(),
  close: z.boolean(),
  uploadId: z.string().optional(),
  fileId: z.string().optional(),
  roomId: z.string().optional(),
  assetId: z.string().optional(),
  filename: z.string().optional(),
  phase: z.enum(['uploading', 'metadata', 'processing', 'rendering', 'ready', 'failed']).optional(),
  progress: z
    .object({
      current: z.number().optional(),
      total: z.number().optional(),
      percent: z.number().optional(),
      unit: z.enum(['files', 'pages', 'bytes']).optional(),
    })
    .optional(),
});

export type MessageSchema = z.infer<typeof schema>;

export type Message = SBDoc & { data: MessageSchema };

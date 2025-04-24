/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

const LinkType = z.union([z.literal('provenance'), z.literal('run_order')]);

const LinkSchema = z.object({
  sourceAppId: z.string(),
  targetAppId: z.string(),
  boardId: z.string(),
  type: LinkType,
  metadata: z.optional(z.record(z.any())), // optional extras: confidence, labels, etc.
});

export type LinkSchema = z.infer<typeof LinkSchema>;
export type Link = SBDoc & { data: LinkSchema };

/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

const schema = z.object({
  // the concerned app
  app_id: z.string(),
  // the board ID to filter the data
  boardId: z.string(),
  // the tags/labels, array of strings
  labels: z.array(z.string()),
});

export type InsightSchema = z.infer<typeof schema>;

export type Insight = SBDoc & { data: InsightSchema };

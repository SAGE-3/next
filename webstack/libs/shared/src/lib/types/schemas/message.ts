/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
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
});

export type MessageSchema = z.infer<typeof schema>;

export type Message = SBDoc & { data: MessageSchema };

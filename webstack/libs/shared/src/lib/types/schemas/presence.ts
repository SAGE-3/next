/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { PositionSchema, SizeSchema } from '../state';
import { SBDoc } from './SBSchema';

const Status = z.enum(['online', 'away', 'offline']);
export type Status = z.infer<typeof Status>;

/**
 * SAGE3 PresenceSchema
 * @interface PresenceSchema
 */
const schema = z.object({
  // Id of the user, Reference to a Auth.id => User => Presence
  userId: z.string(),
  // The status of the user
  status: Status,
  // The roomId the user is located
  roomId: z.string(),
  // The boardId the user is located
  boardId: z.string(),
  // Cursor of the user
  cursor: PositionSchema,
  // Viewport of the user
  viewport: z.object({
    position: PositionSchema,
    size: SizeSchema,
  }),
  following: z.string(),
  // Go to viewport
  goToViewport: z.string(),
});

export type PresenceSchema = z.infer<typeof schema>;

export type Presence = SBDoc & { data: PresenceSchema };
export type PresencePartial = SBDoc & { data: Omit<PresenceSchema, 'cursor' | 'viewport'> };

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

const schema = z.object({
  // Id of the Room
  roomId: z.string(),
  // Member Id
  members: z.array(z.string()),
});

export type RoomMembersSchema = z.infer<typeof schema>;

export type RoomMembers = SBDoc & { data: RoomMembersSchema };

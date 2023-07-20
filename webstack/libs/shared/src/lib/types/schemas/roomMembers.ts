/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

const MemberRole = z.enum(['owner', 'admin', 'member']);
export type MemberRole = z.infer<typeof MemberRole>;

const schema = z.object({
  // Id of the Room
  roomId: z.string(),
  // Members
  members: z.array(
    z.object({
      // Id of the member
      userId: z.string(),
      // Role of the member
      role: MemberRole,
    })
  ),
});

export type RoomMembersSchema = z.infer<typeof schema>;

export type RoomMembers = SBDoc & { data: RoomMembersSchema };

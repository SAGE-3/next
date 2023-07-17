/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

// Room Roles
const RoomRoles = z.enum(['owner', 'moderator', 'collaborator', 'viewer']);
export type RoomRoles = z.infer<typeof RoomRoles>;

// Room Members
const RoomMember = z.object({
  userId: z.string(),
  role: RoomRoles,
});
// Create the Typescript type
export type RoomMember = z.infer<typeof RoomMember>;

const schema = z.object({
  // Name of the Room
  name: z.string(),
  // Description of the room.
  description: z.string(),
  // Color of the room.
  color: z.string(),
  // The ID of the owner of the room
  ownerId: z.string(),
  // Is the room private or public
  isPrivate: z.boolean(),
  privatePin: z.string(),
  // Is the board listed publicly?
  isListed: z.boolean(),
  // Members of the room
  members: z.array(RoomMember),
});

export type RoomSchema = z.infer<typeof schema>;

export type Room = SBDoc & { data: RoomSchema };

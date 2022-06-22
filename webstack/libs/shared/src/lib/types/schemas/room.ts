/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { z } from "zod";
import { SBDoc } from "./SBSchema";

export const RoomSchema = z.object({
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
})

type RoomData = z.infer<typeof RoomSchema>;

export type Room = SBDoc & { data: RoomData };

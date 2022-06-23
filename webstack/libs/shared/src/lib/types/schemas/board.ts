/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from "zod";
import { SBDoc } from "./SBSchema";

/**
 * @typedef {object} BoardSchema
 * Defines the Schema for the BoardModel.
 */
const schema = z.object({
  // Name of the board
  name: z.string(),
  // Description of the board.
  description: z.string(),
  // Color of the board.
  color: z.string(),
  // The id of the room the board belongs to
  roomId: z.string(),
  // The id of the owner of the room
  ownerId: z.string(),
  // Is the booard private or public
  isPrivate: z.boolean(),
})

export type BoardSchema = z.infer<typeof schema>;

export type Board = SBDoc & { data: BoardSchema };
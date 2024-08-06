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
  // Is the board password protected?
  isPrivate: z.boolean(),
  privatePin: z.string(),
  // Code for the room
  code: z.string(),
  // The lines on the board
  whiteboardLines: z.any(),
});

export type BoardSchema = z.infer<typeof schema>;

export type Board = SBDoc & { data: BoardSchema };

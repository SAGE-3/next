/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from "zod";
import { PositionSchema } from "../state";
import { SBDoc } from "./SBSchema";

const Status = z.enum(["online", "away", "offline"]);
export type Status = z.infer<typeof Status>;

/**
 * SAGE3 PresenceSchema
 * @interface PresenceSchema
 */
const schema = z.object({
  // Id of the user
  userId: z.string(),
  // The status of the user
  status: Status,
  // The roomId the user is located
  roomId: z.string(),
  // The boardId the user is located
  boardId: z.string(),
  // Picture of the user.
  cursor: PositionSchema
});

export type PresenceSchema = z.infer<typeof schema>;

export type Presence = SBDoc & { data: PresenceSchema };


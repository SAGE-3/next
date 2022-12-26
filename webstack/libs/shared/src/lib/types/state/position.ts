/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from "zod";

/**
 * @typedef {object} Position
 * Represents the position of an object.
 */
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

// extract the inferred type like this
export type Position = z.infer<typeof PositionSchema>;

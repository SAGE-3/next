/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from "zod";

/**
 * @typedef {object} Size
 * Represents the size of an object.
 */
export const SizeSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

// extract the inferred type like this
export type Size = z.infer<typeof SizeSchema>;
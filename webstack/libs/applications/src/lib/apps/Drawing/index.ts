/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: Drawing
 * created by: SAGE3 Team
 */

export const schema = z.object({
  fit: z.boolean(),
  follow: z.string(),
  camera: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  fit: false,
  follow: '',
};

export const name = 'Drawing';

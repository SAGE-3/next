/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z, ZodNumber } from 'zod';

/**
 * SAGE3 application: Zoom
 * created by: Luc Renambot
 */

export const schema = z.object({
  zid: z.string(),
  zoomLevel: z.number(),
  zoomCenter: z.array(z.number(), z.number()),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  zid: 'e7862b49-6f57-46f6-b75e-7377f7c27387',
  zoomLevel: 1,
};

export const name = 'Zoom';

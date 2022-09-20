/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

/**
 * SAGE3 application: DeepZoomImage
 * created by: Luc Renambot
 */

export const schema = z.object({
  assetid: z.string(),
  zoomLevel: z.number(),
  zoomCenter: z.array(z.number(), z.number()),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  assetid: '',
  zoomLevel: 1,
  zoomCenter: [0.5, 0.5],
};

export const name = 'DeepZoomImage';

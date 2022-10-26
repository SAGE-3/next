/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: ImageViewer
 * created by: SAGE3 team
 */

import { z } from 'zod';

export const schema = z.object({
  assetid: z.string(),
  annotations: z.boolean(),
  boxes: z.any(),
  // boxes: z.record(z.string(), z.record(z.string(), z.number()))
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  assetid: '',
  annotations: false,
  boxes: {},
};

export const name = 'ImageViewer';

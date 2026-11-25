/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import type { App } from '../../schema';

export const name = 'Drawing';

/**
 * SAGE3 application: Drawing
 * created by: SAGE3 Team
 *
 * The live drawing is in the board's Yjs document (`drawing:<appId>`);
 * `shapes` is the saved copy that brings it back when the Yjs server restarts.
 */

export const schema = z.object({
  // Saved copy of the drawing, { [shapeId]: Shape }, validated when loaded (see model/shape.ts)
  shapes: z.record(z.string(), z.unknown()),
  background: z.enum(['white', 'grid']),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  shapes: {},
  background: 'white',
};

export type DrawingApp = App<typeof name>;

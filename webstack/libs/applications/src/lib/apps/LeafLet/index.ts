/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: LeafLet
 * created by: SAGE3 team
 */

import { z } from 'zod';

const Baselayer = z.enum(['OpenStreetMap', 'World Imagery']);
export type Baselayer = z.infer<typeof Baselayer>;

export const schema = z.object({
  location: z.array(z.number(), z.number()),
  zoom: z.number(),
  baseLayer: Baselayer,
  overlay: z.boolean(),
  assetid: z.string().optional(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  location: [21.297, -157.816],
  zoom: 13,
  baseLayer: 'OpenStreetMap',
  overlay: true,
};

export const name = 'LeafLet';

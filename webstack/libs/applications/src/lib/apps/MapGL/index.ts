/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: MapGL
 * created by: Luc Renambot
 */

export const schema = z.object({
  location: z.array(z.number(), z.number()),
  zoom: z.number(),
  baseLayer: z.string(),
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

export const name = 'MapGL';

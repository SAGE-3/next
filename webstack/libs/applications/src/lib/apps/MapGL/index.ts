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
  location: z.array(z.number(), z.number()), // Lng, Lat
  zoom: z.number(),
  bearing: z.number(),
  pitch: z.number(),
  baseLayer: z.string(),
  overlay: z.boolean(),
  assetid: z.string().optional(),
  // Remove single `assetid`; instead, keep an array of layers:
  layers: z.array(
    z.object({
      assetid: z.string(),
      visible: z.boolean(),
    })
  ),
  colorScale: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  location: [-157.816, 21.297], // Lng, Lat
  zoom: 13,
  bearing: 0,
  pitch: 0,
  baseLayer: 'OpenStreetMap',
  overlay: true,
  assetid: '',
  // Start with no overlay layers
  layers: [],
  colorScale: 'greys',
};

export const name = 'MapGL';

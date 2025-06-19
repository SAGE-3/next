/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { colors } from '@sage3/shared';
import { z } from 'zod';

const zColors = z.enum([...colors]);
const colorScale = z.enum(['greys', 'inferno', 'viridis', 'turbo']);

const Layer = z.object({
  assetId: z.string(),
  visible: z.boolean(),
  color: zColors,
  colorScale: colorScale,
  opacity: z.number().min(0).max(1),
});
export type LayerType = z.infer<typeof Layer>;

/**
 * SAGE3 application: Map
 */

export const schema = z.object({
  location: z.array(z.number(), z.number()), // Lng, Lat
  zoom: z.number(),
  bearing: z.number(),
  pitch: z.number(),
  baseLayer: z.string(),
  assetid: z.string().optional(),
  // Remove single `assetid`; instead, keep an array of layers:
  layers: z.array(Layer),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  location: [-157.816, 21.297], // Lng, Lat
  zoom: 13,
  bearing: 0,
  pitch: 0,
  baseLayer: 'OpenStreetMap',
  layers: [],
};

export const name = 'Map';

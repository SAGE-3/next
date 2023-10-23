/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * SAGE3 application: HCDP
 * created by: SAGE3 team
 */

import { z } from 'zod';

const Baselayer = z.enum(['OpenStreetMap', 'World Imagery']);
export type Baselayer = z.infer<typeof Baselayer>;

export const schema = z.object({
  location: z.array(z.number(), z.number()),
  zoom: z.number(),
  baseLayer: Baselayer,
  bearing: z.number(),
  pitch: z.number(),
  overlay: z.boolean(),
  assetid: z.string(),
  processing: z.boolean(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  location: [-157.816, 21.297], // Lng, Lat
  zoom: 13,
  baseLayer: 'OpenStreetMap',
  bearing: 0,
  pitch: 0,
  overlay: true,
  assetid: '',
  processing: false,
};

export const name = 'HCDP';

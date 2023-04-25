/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * SAGE3 application: Hawaii Mesonet
 * created by: SAGE3 team
 */

import { z } from 'zod';

const Baselayer = z.enum(['OpenStreetMap', 'World Imagery']);
export type Baselayer = z.infer<typeof Baselayer>;

const variableTypes = z.enum([
  'temperatureC',
  'temperatureF',
  'soilMoisture',
  'relativeHumidity',
  'windSpeed',
  'solarRadiation',
  'windDirection',
]);

export const schema = z.object({
  location: z.array(z.number(), z.number()),
  zoom: z.number(),
  baseLayer: Baselayer,
  overlay: z.boolean(),
  assetid: z.string().optional(),
  appIdsICreated: z.string().array(),
  fontSizeMultiplier: z.number(),
  variableToDisplay: variableTypes,
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  location: [21.297, -157.816],
  zoom: 8,
  baseLayer: 'OpenStreetMap',
  overlay: true,
  appIdsICreated: [],
  fontSizeMultiplier: 15,
  variableToDisplay: 'temperatureC',
};

export const name = 'Hawaii Mesonet';

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
import { stationDataTemplate } from './data/stationData';

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

function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}
function getFormattedDateTime24HoursBefore() {
  const now = new Date();
  now.setHours(now.getHours() - 24);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}`;
}

const widget = {
  visualizationType: 'variableCard',
  yAxisNames: [],
  xAxisNames: [],
  color: '#5AB2D3',
  layout: { x: 0, y: 0, w: 11, h: 130 },
  operation: 'average',
  startDate: getFormattedDateTime24HoursBefore(),
  endDate: getFormattedDateTime(),
  sinceInMinutes: 1140,
};

export const schema = z.object({
  location: z.array(z.number(), z.number()),
  zoom: z.number(),
  baseLayer: Baselayer,
  overlay: z.boolean(),
  assetid: z.string().optional(),
  appIdsICreated: z.string().array(),
  fontSizeMultiplier: z.number(),
  variableToDisplay: variableTypes,
  stationData: z.any(),
  widget: z.any(),
  stationNames: z.any(),
  isWidgetOpen: z.boolean(),
  stationColor: z.string(),
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
  stationNames: ['012HI'],
  stationData: [...stationDataTemplate],
  widget: widget,
  isWidgetOpen: false,
  stationColor: '',
};

export const name = 'Hawaii Mesonet';

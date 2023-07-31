/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
const Baselayer = z.enum(['OpenStreetMap', 'World Imagery']);

export type Baselayer = z.infer<typeof Baselayer>;

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
  yAxisNames: ['air_temp_set_1'],
  xAxisNames: ['date_time'],
  color: '#5AB2D3',
  startDate: getFormattedDateTime24HoursBefore(),
  layout: { x: 0, y: 0, w: 11, h: 130 },
};
// [
//   { visualizationType: 'variableCard', yAxisNames: ['wind_speed_set_1'], xAxisNames: [''], layout: { x: 0, y: 0, w: 11, h: 130 } },
//   { visualizationType: 'variableCard', yAxisNames: ['relative_humidity_set_1'], xAxisNames: [''], layout: { x: 0, y: 0, w: 11, h: 130 } },
//   { visualizationType: 'variableCard', yAxisNames: ['air_temp_set_1'], xAxisNames: [''], layout: { x: 0, y: 0, w: 11, h: 130 } },
//   { visualizationType: 'line', yAxisNames: ['soil_moisture_set_1'], xAxisNames: ['date_time'], layout: { x: 0, y: 0, w: 11, h: 130 } },
// ];

/**
 * SAGE3 application: Sensor Overview
 * created by: RJ
 */

export const schema = z.object({
  sensorData: z.any(),
  stationNames: z.string().array(),
  listOfStationNames: z.string(),
  widget: z.any(),
  location: z.array(z.number(), z.number()),
  zoom: z.number(),
  baseLayer: Baselayer,
  overlay: z.boolean(),
  assetid: z.string().optional(),
  isWidgetOpen: z.boolean(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  sensorData: {},
  stationNames: ['016HI'],
  listOfStationNames: '016HI',
  location: [21.297, -157.816],
  zoom: 8,
  baseLayer: 'OpenStreetMap',
  overlay: true,
  widget: widget,
  isWidgetOpen: false,
};

export const name = 'SensorOverview';

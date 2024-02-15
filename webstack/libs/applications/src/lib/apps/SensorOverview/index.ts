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

const widget = {
  visualizationType: 'map',
  yAxisNames: ['soil_moisture_set_1'],
  xAxisNames: ['date_time'],
  color: '#5AB2D3',
  startDate: '202401181356',
  endDate: '202401191356',
  timePeriod: '24 hours',
  liveData: true,
  layout: { x: 0, y: 0, w: 11, h: 130 },
};

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
  bearing: z.number(),
  pitch: z.number(),
  assetid: z.string().optional(),
  availableVariableNames: z.string().array(),
  stationScale: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  sensorData: {},
  stationNames: ['016HI', '012HI', '014HI'],
  listOfStationNames: '016HI',
  location: [-157.816, 21.297], //lnglat
  zoom: 10,
  baseLayer: 'OpenStreetMap',
  bearing: 0,
  pitch: 0,
  overlay: true,
  widget: widget,
  availableVariableNames: [],
  stationScale: 5,
};

export const name = 'Hawaii Mesonet';

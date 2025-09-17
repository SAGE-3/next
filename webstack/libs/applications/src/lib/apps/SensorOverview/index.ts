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
  yAxisNames: ['RH_1_Min'],
  xAxisNames: ['date_time'],
  color: '#5AB2D3',
  startDate: '2024-01-18T13:56:00.000Z',
  endDate: '2024-01-19T13:56:00.000Z',
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
  url: z.string(),
  stationFriendlyNames: z.string().array(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  sensorData: {},
  stationNames: ['0501', '0502', '0503'],
  listOfStationNames: '',
  location: [-157.816, 20.9], //lnglat
  zoom: 6,
  baseLayer: 'OpenStreetMap',
  bearing: 0,
  pitch: 0,
  overlay: true,
  widget: widget,
  availableVariableNames: [],
  stationScale: 5,
  url: '',
  stationFriendlyNames: [],
};

export const name = 'Hawaii Mesonet';

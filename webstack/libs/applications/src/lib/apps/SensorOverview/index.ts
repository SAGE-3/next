/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

const widgets = [
  { visualizationType: 'variableCard', yAxisNames: ['wind_speed_set_1'], xAxisNames: [''], layout: { x: 0, y: 0, w: 11, h: 130 } },
  { visualizationType: 'variableCard', yAxisNames: ['relative_humidity_set_1'], xAxisNames: [''], layout: { x: 0, y: 0, w: 11, h: 130 } },
  { visualizationType: 'variableCard', yAxisNames: ['air_temp_set_1'], xAxisNames: [''], layout: { x: 0, y: 0, w: 11, h: 130 } },
  { visualizationType: 'line', yAxisNames: ['soil_moisture_set_1'], xAxisNames: ['date_time'], layout: { x: 0, y: 0, w: 11, h: 130 } },
];

/**
 * SAGE3 application: Sensor Overview
 * created by: RJ
 */

export const schema = z.object({
  sensorData: z.any(),
  stationName: z.string(),
  listOfStationNames: z.string().array(),
  widgetsEnabled: z.any(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  sensorData: {},
  stationName: '016HI',
  listOfStationNames: [],
  widgetsEnabled: widgets,
};

export const name = 'SensorOverview';

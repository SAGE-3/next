/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: Sensor Overview
 * created by: RJ
 */

export const schema = z.object({
  sensorData: z.any(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  sensorData: {},
};

export const name = 'SensorOverview';

/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: Chat
 * created by: SAGE3 Team
 */

export const schema = z.object({
  //MapGL State
  location: z.array(z.number(), z.number()), // Lng, Lat
  zoom: z.number(),
  bearing: z.number(),
  pitch: z.number(),
  baseLayer: z.string(),
  overlay: z.boolean(),
  assetid: z.string().optional(),
  colorScale: z.string(),

  //ChatState
  previousQ: z.string(),
  previousA: z.string(),
  context: z.string(),
  spec: z.any(),
  messages: z
    .object({
      id: z.string(),
      creationId: z.string(),
      creationDate: z.number(),
      userName: z.string(),
      query: z.string(),
      response: z.string(),
      userId: z.string(),
    })
    .array(),

  isStudyStarted: z.boolean(),
  chartsCreated: z.any(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  //MapGL State
  location: [-157.9, 21.4], //lnglat
  zoom: 8,
  bearing: 0,
  pitch: 0,
  baseLayer: 'OpenStreetMap',
  overlay: true,
  assetid: '',
  colorScale: 'greys',

  //ChatState
  previousQ: '',
  previousA: '',
  context: '',
  spec: {},
  messages: [
    {
      id: 'starting',
      creationId: 'starting',
      creationDate: Date.now(),
      userName: '',
      query: '',
      response: `Hi I am Artie, the NLChartGenerator! Ask me anything when starting with @A?`,
      userId: '',
    },
  ],

  isStudyStarted: false,
  chartsCreated: [],
};

export const name = 'NLChartGenerator';

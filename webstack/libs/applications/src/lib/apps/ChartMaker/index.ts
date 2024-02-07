/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Asset } from '@sage3/shared/types';
import { z } from 'zod';

/**
 * SAGE3 application: chartMaker
 * created by: RJ
 */

export const schema = z.object({
  input: z.string(),
  fileReference: z.string(),
  fileName: z.string(),
  headers: z.string().array(),
  dataRow: z.string().array(),
  propertyList: z.any(),
  storyIndex: z.number(),
  currentAppCreated: z.any(),
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
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  input: '',
  fileReference: '',
  fileName: '',
  headers: [],
  dataRow: [],
  propertyList: [],
  storyIndex: 0,
  currentAppCreated: [],
  messages: [
    {
      id: 'starting',
      creationId: 'starting',
      creationDate: 0,
      userName: '',
      query: '',
      response: `Hi! Would you like to access the Hawaii Climate Data Portal? Use the app toolbar to respond.`,
      userId: '',
    },
  ],
};

export const name = 'ChartMaker';

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Asset } from '@sage3/shared/types';
import { z } from 'zod';

/**
 * SAGE3 application: chartMaker
 * created by: RJ
 */

export const schema = z.object({
  specification: z.number(),
  input: z.string(),

  fileReference: z.string(),
  fileName: z.string(),
  headers: z.string().array(),
  dataRow: z.string().array(),
  propertyList: z.any(),
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
  specification: 42,
  input: '',
  fileReference: '',
  fileName: '',
  headers: [],
  dataRow: [],
  propertyList: [],
  messages: [],
};

export const name = 'ChartMaker';

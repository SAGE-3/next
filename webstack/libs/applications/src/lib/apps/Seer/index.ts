/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { executeInfoType } from '../SageCell';

/**
 * SAGE3 application: Seer
 * created by: Mahdi
 */

const executeInfoSchema = z.object({
  executeFunc: z.string(),
  params: z.record(z.any()),
});
const fieldTypes = z.enum(['code', 'text']);
export type fieldT = z.infer<typeof fieldTypes>;

export const schema = z.object({
  fontSize: z.number(),
  fieldType: fieldTypes,
  execCount: z.number(),
  code: z.string(),
  output: z.string(),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});

// export type executeInfoType = z.infer<typeof executeInfoSchema>;
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  fieldType: 'code',
  code: '',
  output: '',
  executeInfo: { executeFunc: '', params: {} } as executeInfoType,
  fontSize: 24,
};

export const name = 'Seer';

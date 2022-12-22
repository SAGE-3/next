/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { any, z } from 'zod';

/**
 * SAGE3 application: LinkerApp
 * created by: RJ
 */

export const schema = z.object({
  app1Id: z.string(),
  app2Id: z.string(),
  app1Prop: z.string(),
  app2Prop: z.string(),
  isLinked: z.boolean(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  app1Id: 'none',
  app2Id: 'none',
  app1Prop: 'none',
  app2Prop: 'none',
  isLinked: false,
};

export const name = 'Linker';

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { pluginJSONSchema } from '@sage3/shared/types';
import type { App } from '../../schema';

export const name = 'PluginApp';

/**
 * SAGE3 application: PluginApp
 * created by: Ryan
 */

export const schema = z.object({
  pluginId: z.string(),
  viewId: z.string(),
  content: z.record(pluginJSONSchema),
  contentRevision: z.number().int().nonnegative().optional(),
  texts: z.record(z.string()).optional(),
});

export type state = z.infer<typeof schema>;

export const init: state = {
  pluginId: '',
  viewId: '',
  content: {},
};

export type PluginAppApp = App<typeof name>;

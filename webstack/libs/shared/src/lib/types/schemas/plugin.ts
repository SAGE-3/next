/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

const Status = z.enum(['online', 'away', 'offline']);
export type Status = z.infer<typeof Status>;

/**
 * SAGE3 PluginApp Schema
 * @interface PluginApp
 */
const schema = z.object({
  // Id of the user who uploads the app.
  creatorId: z.string(),
  // Uploaded At
  dateCreated: z.string(),
  // Name of the plugin app
  name: z.string(),
});

export type PluginAppSchema = z.infer<typeof schema>;

export type PluginApp = SBDoc & { data: PluginAppSchema };

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

/**
 * SAGE3 PluginApp Schema
 * @interface Plugin
 */
const schema = z.object({
  // Id of the user who uploads the plugin.
  ownerId: z.string(),
  // Name of user who uploads the plugin.
  ownerName: z.string(),
  // Uploaded At
  dateCreated: z.string(),
  // Name of the plugin app
  name: z.string(),
  // Description of the plugin app
  description: z.string(),
  // Rooms
  rooms: z.array(z.string()).optional(),
});

export type PluginSchema = z.infer<typeof schema>;

export type Plugin = SBDoc & { data: PluginSchema };

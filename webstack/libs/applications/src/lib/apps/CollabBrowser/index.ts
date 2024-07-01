/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: CollabBrowser
 * created by: Christopher Lee
 */

export const schema = z.object({
  vmId: z.string(),
  nonOwnerViewOnly: z.boolean(),
  lastImage: z.string(),
  initialWebPage: z.string(),
  refreshSeed: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  vmId: undefined,
  nonOwnerViewOnly: false,
  lastImage: undefined,
  // This is only used for the paste-handler to open in vnc-firefox
  initialWebPage: undefined,
  refreshSeed: 0,
};

export const name = 'CollabBrowser';

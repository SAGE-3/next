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
  nonOwnerViewOnly: z.boolean(),
  clipboard: z.string(),
  lastImage: z.string(),
  init: z.boolean(),
  initialWebPage: z.string(),
  urls: z.array(z.string()),
  audio: z.boolean(),
  refreshSeed: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  nonOwnerViewOnly: false,
  clipboard: "",
  lastImage: undefined,
  // This is only used for the paste-handler to open in vnc-firefox
  init: false,
  initialWebPage: undefined,
  urls: [],
  audio: false,
  refreshSeed: 0,
};

export const name = 'CollabBrowser';

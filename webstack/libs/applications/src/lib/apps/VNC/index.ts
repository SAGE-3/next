/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: VNC
 * created by: Chris L.
 */

export const schema = z.object({
  nonOwnerViewOnly: z.boolean(),
  clipboard: z.string(),
  lastImage: z.string(),
  refreshSeed: z.number(),
  // init: z.boolean(),

  // initalizerUserId: z.string(),
  ip: z.string(),
  port: z.string(),
  // password: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  nonOwnerViewOnly: false,
  clipboard: "",
  lastImage: undefined,
  refreshSeed: 0,
  // init: false,
  // initalizerUserId: undefined, // the person who hits connect is this user
  ip: "",
  port: "",
  // password: "", // we should not store password and cannot encrypt/hash+salt it, ask user everytime is the optimal choice.

};

export const name = 'VNC';

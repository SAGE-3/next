/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: CoBrowser
 * created by: Christopher Lee
 */

export const schema = z.object({
  nonOwnerViewOnly: z.boolean(),
  clipboard: z.string(),
  lastImage: z.string().optional(),
  // Tracks whether the owner has started the VEO container for this session
  init: z.boolean(),
  audio: z.boolean(),
  refreshSeed: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  nonOwnerViewOnly: false,
  clipboard: '',
  lastImage: undefined,
  init: false,
  audio: true,
  refreshSeed: 0,
};

export const name = 'CoBrowser';

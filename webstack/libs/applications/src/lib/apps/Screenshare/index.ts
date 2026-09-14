/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: Screenshare (self-hosted LiveKit SFU)
 * created by: Ryan
 */

// The published track is named after the app _id, and ownership of the capture
// lives in the session's screenshare store, so neither needs to be in the app state.
export const schema = z.object({
  aspectRatio: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  aspectRatio: 16 / 9,
};

export const name = 'LocalScreenshare';

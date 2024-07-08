/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: Twilio
 * created by: Ryan
 */

export const schema = z.object({
  videoId: z.string(),
  aspectRatio: z.number(),
  accessId: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  videoId: '',
  aspectRatio: 1,
  accessId: '',
};

export const name = 'Screenshare-Old';

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

/**
 * SAGE3 application: Twilio
 * created by: Ryan
 */

export const schema = z.object({
  videoId: z.string(),
  aspectRatio: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  videoId: '',
  aspectRatio: 1,
};

export const name = 'Screenshare';

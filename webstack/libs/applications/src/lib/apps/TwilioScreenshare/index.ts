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
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  videoId: '',
};

export const name = 'Screenshare';

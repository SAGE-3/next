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
  twilioRoomId: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  twilioRoomId: `twilio - room - 1`,
};

export const name = 'Twilio';

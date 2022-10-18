/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

/**
 * SAGE3 application: RTCChat
 * created by: Luc Renambot
 */

export const schema = z.object({
  board: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  board: '',
};

export const name = 'RTCChat';

/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: Chat
 * created by: SAGE3 Team
 */

export const schema = z.object({
  messages: z
    .object({
      id: z.string(),
      creationId: z.string(),
      creationDate: z.number(),
      userName: z.string(),
      query: z.string(),
      response: z.string(),
      userId: z.string(),
    })
    .array(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  messages: [
    {
      id: 'starting',
      creationId: 'starting',
      creationDate: 0,
      userName: '',
      query: '',
      response: `Hi I am Geppetto! Would you like to chat with me?`,
      userId: '',
    },
  ],
};

export const name = 'Chat';
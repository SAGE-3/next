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
  previousQ: z.array(z.string()),
  previousA: z.array(z.string()),
  context: z.string(),
  token: z.string(),
  sources: z.array(z.string()),
  firstQuestion: z.string(),
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
  previousQ: [],
  previousA: [],
  context: '',
  token: '',
  sources: [],
  firstQuestion: '',
  messages: [
    {
      id: 'starting',
      creationId: 'starting',
      creationDate: Date.now(),
      userName: '',
      query: '',
      response: 'I am SAGE AI! Ask me anything by directing the question to me (@S), or chat with people in the board',
      userId: '',
    },
  ],
};

export const name = 'Chat';

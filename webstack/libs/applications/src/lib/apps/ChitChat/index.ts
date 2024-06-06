/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: ChitChat
 * created by: SAGE3 Team
 */

export const schema = z.object({
  context: z.object({
    prompt: z.string(),
    pos: z.array(z.number()),
  }),
  question: z.object({
    id: z.string(),
    prompt: z.string(),
  }),
  answer: z.object({
    id: z.string(),
    response: z.string(),
  }),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  context: {
    prompt: '',
    pos: [0, 0],
  },
  question: {
    id: '',
    prompt: '',
  },
  answer: {
    id: '',
    response: '',
  },
};

export const name = 'ChitChat';

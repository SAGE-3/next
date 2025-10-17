/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: DocuCHAT
 * created by: Ben
 */

export const schema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.number(),
  })),
  isLoading: z.boolean(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  messages: [],
  isLoading: false,
};

export const name = 'DocuCHAT';

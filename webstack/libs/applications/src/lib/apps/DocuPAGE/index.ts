/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: DocuPAGE
 * created by: Ben
 */

export const schema = z.object({
  topic: z.string(),
  title: z.string().optional(),
  authors: z.array(z.string()).optional(),
  year: z.string().optional(),
  venue: z.string().optional(),
  summary: z.string().optional(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  topic: '',
};

export const name = 'DocuPAGE';

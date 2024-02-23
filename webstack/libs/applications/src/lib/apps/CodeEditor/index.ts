/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: CodeEditor
 * created by: SAGE3 team
 */

export const schema = z.object({
  assetid: z.string(),
  content: z.string(),
  language: z.string(),
  fontSize: z.number(),
  readonly: z.boolean(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  assetid: '',
  content: '',
  language: 'javascript',
  fontSize: 18,
  readonly: false,
};

export const name = 'CodeEditor';

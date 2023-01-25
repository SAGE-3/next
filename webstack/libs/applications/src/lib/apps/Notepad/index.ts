/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

export const schema = z.object({
  content: z.object({
    ops: z.array(z.any()),
  }),
});
export type state = z.infer<typeof schema>;

export const init: state = {
  content: { ops: [] },
};

export const name = 'Notepad';

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

export const schema = z.object({
  text: z.string(),
  fontSize: z.number(),
  color: z.string(),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});
export type state = z.infer<typeof schema>;

export const init: state = {
  text: 'stickie note',
  fontSize: 42,
  color: 'yellow',
  executeInfo: { executeFunc: '', params: {} },
};

export const name = 'Stickie';

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

/**
 * SAGE3 application: PyScript
 * created by: Luc Renambot
 */

export const schema = z.object({
  pycode: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  pycode: 'x = 12',
};

export const name = 'PyScript';

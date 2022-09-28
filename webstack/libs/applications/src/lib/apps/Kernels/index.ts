/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

/**
 * SAGE3 application: Kernels
 * created by: SAGE3 Team
 */

export const schema = z.object({
  xx: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  xx: 42,
};

export const name = 'Kernels';

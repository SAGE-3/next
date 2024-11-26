/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: ExportBoard
 * created by: Shrut
 */

export const schema = z.object({
  Count: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  Count: 12,
};

export const name = 'ExportBoard';

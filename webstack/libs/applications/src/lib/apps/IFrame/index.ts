/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: IFrame
 * created by: SAGE3 Team
 */

export const schema = z.object({
  source: z.string(),
  doc: z.string().optional(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  source: '',
  doc: '',
};

export const name = 'IFrame';

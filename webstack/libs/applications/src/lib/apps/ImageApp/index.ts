/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

export const schema = z.object({
  url: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  url: 'https://picsum.photos/id/236/200/300',
};

export const name = 'Image';

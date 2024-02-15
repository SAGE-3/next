/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: CloudLink
 * created by: SAGE3 Team
 */

export const schema = z.object({
  url: z.string(),
  assets: z.array(z.string()),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  url: 'https://drive.google.com/drive/folders/1UWDtAsfYatsRwp3N0n_qf5dnRDelAxq9',
  assets: [],
};

export const name = 'CloudLink';

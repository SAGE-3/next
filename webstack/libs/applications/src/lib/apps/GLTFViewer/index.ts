/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: GLTFViewer
 * created by: Luc Renambot
 */

import { z } from 'zod';

export const schema = z.object({
  assetid: z.string(),
  avatarPosition: z.array(z.number()).length(3),
  avatarOrientation: z.array(z.number()).length(3),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  assetid: '',
  avatarPosition: [0, 0, 0],
  avatarOrientation: [0, 0, 0],
};

export const name = 'GLTFViewer';

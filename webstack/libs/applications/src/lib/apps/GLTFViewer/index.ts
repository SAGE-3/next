/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * SAGE3 application: GLTFViewer
 * created by: Luc Renambot
 */

import { z } from 'zod';

export const schema = z.object({
  assetid: z.string(),
  p: z.number(),
  a: z.number(),
  d: z.number(),
  avatarPosition: z.array(z.number()).length(3),
  avatarOrientation: z.array(z.number()).length(3),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  assetid: '',
  p: 0,
  a: 0,
  d: 2,
  avatarPosition: [0, 0, 0],
  avatarOrientation: [0, 0, 0],
};

export const name = 'GLTFViewer';

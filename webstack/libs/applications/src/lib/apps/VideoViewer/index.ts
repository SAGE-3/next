/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * SAGE3 application: VideoViewer
 * created by: SAGE3 Team
 */

import { z } from 'zod';

export const schema = z.object({
  currentTime: z.number(),
  paused: z.boolean(),
  loop: z.boolean(),
  assetid: z.string(),
  controllerId: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: state = {
  assetid: '',
  currentTime: 0,
  paused: true,
  loop: false,
  controllerId: '',
};

export const name = 'VideoViewer';

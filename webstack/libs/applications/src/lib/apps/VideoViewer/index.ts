/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: VideoViewer
 * created by: SAGE3 Team
 */

import { z } from 'zod';

export const schema = z.object({
  play: z.object({ paused: z.boolean(), uid: z.string(), currentTime: z.number(), loop: z.boolean(), seeked: z.boolean() }),
  assetid: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: state = {
  play: { paused: true, uid: '', currentTime: 0, loop: false, seeked: false },
  assetid: '',
};

export const name = 'VideoViewer';

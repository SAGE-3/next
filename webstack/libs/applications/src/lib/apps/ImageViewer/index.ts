/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * SAGE3 application: ImageViewer
 * created by: SAGE3 team
 */

import { z } from 'zod';

const bboxType = z.array(
  z.object({
    label: z.string(),
    xmin: z.number(),
    ymin: z.number(),
    xmax: z.number(),
    ymax: z.number(),
  })
);

export const schema = z.object({
  assetid: z.string(),
  annotations: z.boolean(),
  boxes: bboxType,
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.any(),
  }),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  executeInfo: { executeFunc: '', params: {} },
  assetid: '',
  annotations: false,
  boxes: [],
};

export const name = 'ImageViewer';

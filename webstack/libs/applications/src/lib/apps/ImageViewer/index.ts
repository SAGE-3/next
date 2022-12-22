/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: ImageViewer
 * created by: SAGE3 team
 */

import {z} from 'zod';
import {bboxType, bboxtype2} from "./data_types";


export const schema = z.object({
  assetid: z.string(),
  annotations: z.boolean(),

  boxes:  bboxtype2,


  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),

});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  executeInfo: {executeFunc: '', params: {}},
  assetid: '',
  annotations: false,
  boxes: {},
};

export const name = 'ImageViewer';

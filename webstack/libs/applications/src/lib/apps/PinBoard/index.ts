/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {z} from 'zod';

const ListItemType = z.array(
  z.object({
    item: z.any(),
    isDragging: z.boolean()
  })
);

const ListType = z.array(
  z.object({
    listID: z.string(),
    list: ListItemType,
    position: z.object({
      x: z.number(),
      y: z.number()
    }),
    size: z.object({
      width: z.number(),
      height: z.number()
    })
  })
)

export const schema = z.object({
  lists: ListType,
  items: z.any(),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  executeInfo: {executeFunc: '', params: {}},
  lists: [],
  items: []
};

export const name = 'PinBoard';

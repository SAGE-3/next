/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {z} from 'zod';

interface ListItem {
  item: string;
  isDragging: boolean;
}

const ListItemType = z.array(
  z.object({
    item: z.string(),
    isDragging: z.boolean()
  })
);

interface Lists {
  listId: string;
  list: ListItem[];
  position: { x: number, y: number };
  size: { width: number, height: number };
}

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
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  executeInfo: {executeFunc: '', params: {}},
  lists: [],
};

export const name = 'PinBoard';

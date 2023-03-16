/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

const ListItem = z.object({
  item: z.string(), // TODO: should be a string or a ReactNode (or a ReactElement?)
  isDragging: z.boolean(),
});

const List = z.object({
  items: z.array(ListItem),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
});

export const schema = z.object({
  lists: z.array(List),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});

export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  executeInfo: { executeFunc: '', params: {} },
  lists: [],
};

export const name = 'PinBoard';

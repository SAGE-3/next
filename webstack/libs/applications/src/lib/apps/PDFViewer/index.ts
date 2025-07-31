/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * SAGE3 application: PDFViewer
 * created by: Luc Renambot
 */

import { z } from 'zod';

// Layout mode enum for different page arrangements
export const LayoutMode = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
} as const;

export type LayoutModeType = typeof LayoutMode[keyof typeof LayoutMode];

export const schema = z.object({
  assetid: z.string(),
  currentPage: z.number(),
  numPages: z.number(),
  displayPages: z.number(),
  layoutMode: z.enum([LayoutMode.HORIZONTAL, LayoutMode.VERTICAL]).default(LayoutMode.HORIZONTAL),
  // Functions to execute
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.any(),
  }),
  analyzed: z.string(),
  client: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  assetid: '',
  currentPage: 0,
  numPages: 1,
  displayPages: 1,
  layoutMode: LayoutMode.HORIZONTAL,
  executeInfo: { executeFunc: '', params: {} },
  analyzed: '',
  client: '',
};

export const name = 'PDFViewer';

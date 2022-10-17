/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: PDFViewer
 * created by: Luc Renambot
 */

import { z } from 'zod';

export const schema = z.object({
  assetid: z.string(),
  currentPage: z.number(),
  numPages: z.number(),
  displayPages: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  assetid: '',
  currentPage: 0,
  numPages: 1,
  displayPages: 1,
};


export const name = 'PDFViewer';

/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: DOCXViewer
 * created by: Luc Renambot
 */

export const schema = z.object({
  // The Word document displayed by the app
  assetid: z.string(),
  // Page shown to everyone on the board (0-based). The app splits the rendered document
  // into printed pages itself (the renderer lays text out continuously).
  currentPage: z.number(),
  // Number of pages, known once the document has been rendered (0 until then)
  numPages: z.number(),
  // Number of pages shown side by side, starting at currentPage
  displayPages: z.number(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  assetid: '',
  currentPage: 0,
  numPages: 0,
  displayPages: 1,
};

export const name = 'DOCXViewer';

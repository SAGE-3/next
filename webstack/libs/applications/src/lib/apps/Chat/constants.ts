/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { TaskType } from '@sage3/shared/types';

// The kind of content the Chat is operating on (drives the prompt bar and the
// capability check). Derived from the type of the linked source app.
export type OperationMode = 'chat' | 'text' | 'image' | 'web' | 'pdf' | 'code' | 'map';

// Maximum number of images sent to the vision model in a single question. Too
// many images blow up the context window and degrade the model's ability to
// attribute details to the right image (especially the filter/select path).
export const MAX_IMAGES = 6;

// Maximum number of PDFs asked about in a single question. Each document is
// large, and the summary/comparison route stuffs labeled full text into the
// prompt, so a few PDFs overwhelm the context faster than a few images.
export const MAX_PDFS = 5;

// Which AI task each mode maps to, so we can check the selected model's
// capabilities (declared in the server config) before sending to the backend.
export const MODE_TASK: Record<OperationMode, TaskType> = {
  chat: 'chat',
  text: 'chat',
  map: 'chat',
  web: 'chat',
  image: 'image',
  pdf: 'pdf_processing',
  code: 'coding',
};

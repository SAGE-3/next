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
export type OperationMode = 'chat' | 'text' | 'image' | 'web' | 'pdf' | 'code' | 'map' | 'Hawaii Mesonet';

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
  'Hawaii Mesonet': 'chat',
};

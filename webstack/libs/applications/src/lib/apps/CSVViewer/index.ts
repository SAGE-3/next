/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * SAGE3 application: CSVViewer
 * created by: Luc Renambot
 */

import { z } from 'zod';
import type { App } from '../../schema';

export const name = 'CSVViewer';

export const schema = z.object({
  assetid: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  assetid: '',
};

export type CSVViewerApp = App<typeof name>;

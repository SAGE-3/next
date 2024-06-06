/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

/**
 * SAGE3 application: JupyterApp
 * created by: SAGE3
 */

export const schema = z.object({
  jupyterURL: z.string(),
  notebook: z.string(),
  zoom: z.number(),
  kernel: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: state = {
  jupyterURL: '',
  notebook: '',
  zoom: 1,
  kernel: '',
};

export const name = 'JupyterLab';

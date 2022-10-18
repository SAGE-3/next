/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

/**
 * SAGE3 application: JupyterApp
 * created by: SAGE3
 */

export const schema = z.object({
  jupyterURL: z.string(),
  notebook: z.string().optional(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  jupyterURL: 'http://localhost',
  notebook: '',
};

export const name = 'JupyterLab';

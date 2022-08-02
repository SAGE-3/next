/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: Webview
 * created by: SAGE3 Team
 */

import { z } from 'zod';

export const schema = z.object({
  webviewurl: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  webviewurl: 'https://google.com/',
};

export const name = 'Webview';

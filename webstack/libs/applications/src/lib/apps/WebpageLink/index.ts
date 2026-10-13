/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import type { App } from '../../schema';

export const name = 'WebpageLink';

/**
 * SAGE3 application: WebpageLink
 * created by: Ryan Theriot
 */

export type URLMetadata = {
  title: string;
  description: string;
  image: string;
};

export const schema = z.object({
  url: z.string(),
  streaming: z.boolean(),
  meta: z.object({} as any),
});
export type state = z.infer<typeof schema>;

export const init: state = {
  url: 'http://google.com',
  streaming: false,
  meta: {
    title: '',
    description: '',
    image: '',
  },
};

export type WebpageLinkApp = App<typeof name>;

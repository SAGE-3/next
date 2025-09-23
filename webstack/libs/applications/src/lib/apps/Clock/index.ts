/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';

export const schema = z.object({
  file: z.string(),
  city: z.string(),
  timeZone: z.string(),
  //state for 24 hour time
  is24Hour: z.boolean()
});
export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  file: '',
  city: '',
  timeZone: '',
  is24Hour: false
};

export const name = 'Clock';

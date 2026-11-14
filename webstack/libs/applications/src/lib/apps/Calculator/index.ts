/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import type { App } from '../../schema';

export const name = 'Calculator';

/**
 * SAGE3 application: Calculator
 * created by: Loelle Lam
 */

export const schema = z.object({
  input: z.string(),
  history: z.string(),
});
export type state = z.infer<typeof schema>;

export const init: state = {
  input: '',
  history: '',
};

export type CalculatorApp = App<typeof name>;

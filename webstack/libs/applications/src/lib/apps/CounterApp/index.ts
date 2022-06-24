/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

export type state = {
  count: number;
  execute: string;
};

export const init: Partial<state> = {
  count: 42,
  execute: ""
};

export const name = 'Counter';

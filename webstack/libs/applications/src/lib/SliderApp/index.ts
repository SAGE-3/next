/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

export type state = {
  value: number;
};

export const init: Partial<state> = {
  value: 55,
};

export const name = 'Slider';

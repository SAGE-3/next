/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

export type state = {
  text: string;
};

export const init: Partial<state> = {
  text: 'empty note',
};

export const name = 'Note';

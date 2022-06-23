/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: Screenshare
 * created by: SAGE3 Team
 */

export type state = {
  owner: string;
};

export const init: Partial<state> = {
  owner: 'tom',
};

export const name = 'Screenshare';

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: ImageViewer
 * created by: SAGE3 team
 */

export type state = {
  url: string;
};

export const init: Partial<state> = {
  url: 'none',
};

export const name = 'ImageViewer';

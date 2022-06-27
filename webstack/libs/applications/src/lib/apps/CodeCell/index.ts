/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { SBPrimitive, SBJSON } from '@sage3/sagebase';

/**
 * SAGE3 application: CodeCell
 * created by: SAGE3 team
 */

export type state = {
  code: string;
  execute: { name: string; params: SBJSON[] };
  output: string;
};

export const init: Partial<state> = {
  code: 'x = 12',
  execute: {
    name: 'print',
    params: [
      { name: 'arg1', val: 42 },
      { name: 'arg2', val: 'toto' },
    ],
  },
  output: 'None',
};

export const name = 'CodeCell';


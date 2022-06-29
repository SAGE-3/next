/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

type exec = {
    executeFunc: string;
    params: { [key: string]: any };
}

export type state = {
  count: number;
  executeInfo: exec;
};

export const init: Partial<state> = {
  count: 42,
   executeInfo: {"executeFunc": "", "params": {}}

};

export const name = 'Counter';

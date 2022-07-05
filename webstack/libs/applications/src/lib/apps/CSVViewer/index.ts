/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: CSVViewer
 * created by: Luc Renambot
 */

export type state = {
  id: string;
};

export const init: Partial<state> = {
  id: "",
};

export const name = 'CSVViewer';

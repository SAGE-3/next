/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * SAGE3 application: PDFViewer
 * created by: Luc Renambot
 */

export type state = {
  page: number;
};

export const init: Partial<state> = {
  page: 11,
};

export const name = 'PDFViewer';

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppProps } from '@sage3/shared/types';

export const meta = {
  name: 'Notebook Viewer',
  description: 'Notebook Viewer',
  showInMenu: false,
  initialSize: {
    width: 680,
    height: 776,
  },
  data: {
    file: '.ipynb',
  },
  state: {},
} as const;

export type NotebookViewerProps = AppProps<typeof meta>;

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppProps } from '@sage3/shared/types';
import { pdfReducer, PDFState } from './state-reducers';

export const meta = {
  name: 'PDF Viewer',
  description: 'PDF Viewer',
  showInMenu: false,
  initialSize: {
    width: 600,
    height: 776,
  },
  data: {
    file: '.pdf',
  },
  state: {
    pdfState: {
      type: 'reducer',
      initialState: {
        currentPage: 0,
        numPages: 1,
      } as PDFState,
      reducer: pdfReducer,
    },
  },
} as const;

export type PdfViewerProps = AppProps<typeof meta>;

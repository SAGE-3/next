/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { DataReducer } from '@sage3/shared/types';

export type PDFState = { currentPage: number; numPages: number; fileName: string };

export type PDFAction =
  | {
      type: 'add-page';
    }
  | {
      type: 'remove-page';
    }
  | {
      type: 'to-start';
    }
  | {
      type: 'prev-page';
      step?: number;
    }
  | {
      type: 'next-page';
      length: number;
      step?: number;
    }
  | {
      type: 'to-end';
      length: number;
    };

export const pdfReducer: DataReducer<PDFState, PDFAction> = (prevState, action) => {
  switch (action.type) {
    case 'remove-page':
      if (prevState.numPages <= 1) return prevState;

      return { ...prevState, numPages: prevState.numPages - 1 };

    case 'add-page':
      return { ...prevState, numPages: prevState.numPages + 1 };

    case 'to-start':
      if (prevState.currentPage === 0) return prevState;

      return { ...prevState, currentPage: 0 };

    case 'prev-page':
      if (prevState.currentPage === 0) return prevState;

      return { ...prevState, currentPage: Math.max(0, prevState.currentPage - (action.step ?? 1)) };

    case 'next-page':
      if (prevState.currentPage === action.length - 1) return prevState;

      return { ...prevState, currentPage: Math.min(prevState.currentPage + (action.step ?? 1), action.length - 1) };

    case 'to-end':
      if (prevState.currentPage === action.length) return prevState;
      return { ...prevState, currentPage: action.length - 1 - (prevState.numPages - 1) };
  }
  return prevState;
};

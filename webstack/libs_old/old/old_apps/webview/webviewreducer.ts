/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { DataReducer } from '@sage3/shared/types';

export type AddressState = {
  history: string[];
  historyIdx: number;
};

export type VisualState = {
  zoom: number;
  scrollX: number;
  scrollY: number;
};

export type AddressAction =
  | {
      type: 'init';
    }
  | {
      type: 'navigate';
      url: string;
    }
  | {
      type: 'navigate-by-history';
      index: number;
    }
  | {
      type: 'back';
    }
  | {
      type: 'forward';
    };

export type VisualAction =
  | {
      type: 'zoom-in';
    }
  | {
      type: 'zoom-out';
    }
  | {
      type: 'scroll';
      x: number;
      y: number;
    };

export const addressReducer: DataReducer<AddressState, AddressAction> = (prevState, action) => {
  switch (action.type) {
    case 'init': {
      // create a clone of the array from the app specification
      return { history: [...prevState.history], historyIdx: prevState.historyIdx };
    }
    case 'navigate': {
      const newHistory = prevState.history;
      newHistory.unshift(action.url);
      newHistory.length = Math.min(10, newHistory.length);
      return { history: newHistory, historyIdx: 0 };
    }
    case 'navigate-by-history':
      return { ...prevState, historyIdx: action.index };

    case 'back':
      return { ...prevState, historyIdx: Math.min(prevState.historyIdx + 1, prevState.history.length - 1) };

    case 'forward':
      return { ...prevState, historyIdx: Math.max(prevState.historyIdx - 1, 0) };

    default:
      return prevState;
  }
};

export const visualReducer: DataReducer<VisualState, VisualAction> = (prevState, action) => {
  switch (action.type) {
    case 'zoom-in':
      return { ...prevState, zoom: Math.min(prevState.zoom + 0.1, 3) };
    case 'zoom-out':
      return { ...prevState, zoom: Math.max(prevState.zoom - 0.1, 0.1) };
    case 'scroll':
      return { ...prevState, scrollX: action.x, scrollY: action.y };
    default:
      return prevState;
  }
};

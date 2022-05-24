/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { UUID, DataReducer } from '@sage3/shared/types';

/**
 * A 2D point with optional pressure value
 */
type StrokePoint = [number, number, number?];

/**
 * A stroke is unique collection of points with color
 */
export type StrokePath = {
  id: UUID;
  points: StrokePoint[];
  color?: SVGPathElement['style']['fill'];
  user: string;
};

export type StrokeState = StrokePath[];

export type StrokesAction =
  | {
      type: 'create';
      id: UUID;
      points: StrokePoint[];
      color?: SVGPathElement['style']['fill'];
      user: string;
    }
  | {
      type: 'undo';
      user: string;
    }
  | {
      type: 'clear';
    };

export const strokesReducer: DataReducer<StrokeState, StrokesAction> = (prevState, action) => {
  if (action.type === 'create') {
    const { type, ...content } = action;
    return [...prevState, { ...content }];
  } else if (action.type === 'undo') {
    // Remove the last stroke of that user
    const idx = prevState.reduce((acc, f, i) => (f.user === action.user ? i : acc), -1);
    if (idx >= 0) {
      prevState.splice(idx, 1);
      return [...prevState];
    }
  } else if (action.type === 'clear') {
    // Create new empty array
    return [];
  }

  return prevState;
};

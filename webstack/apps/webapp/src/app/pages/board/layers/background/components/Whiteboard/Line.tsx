/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as React from 'react';

import { getStroke } from 'perfect-freehand';
import * as Y from 'yjs';

import { useHexColor } from '@sage3/frontend';
import { useEffect } from 'react';

export interface LineProps {
  line: Y.Map<any>;
  scale: number;
}

export const Line = React.memo(function Line({ line, scale }: LineProps) {
  const { points, color, isComplete } = useLine(line);

  const c = useHexColor(color ? color : 'red');

  const pathData = getSvgPathFromStroke(
    getStroke(points, {
      size: 12,
      thinning: 0.5,
      streamline: 0.6,
      smoothing: 0.7,
      last: isComplete,
    })
  );

  return (
    <g fill={color}>
      <path className="canvas-line" d={pathData} fill={c} />
    </g>
  );
});

export function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

export function useLine(line: Y.Map<any>) {
  const [isComplete, setIsComplete] = React.useState<boolean>();
  const [color, setColor] = React.useState<string>();
  const [pts, setPts] = React.useState<number[][]>([]);

  // Subscribe to changes to the line itself and sync
  // them into React state.
  useEffect(() => {
    function handleChange() {
      const current = line.toJSON();
      setIsComplete(current.isComplete);
      setColor(current.userColor);
    }

    handleChange();

    line.observe(handleChange);

    return () => {
      line.unobserve(handleChange);
    };
  }, [line]);

  // Subscribe to changes in the line's points array and sync
  // them into React state.
  useEffect(() => {
    const points = line.get('points') as Y.Array<number>;

    function handleChange() {
      // For performance reasons (I think), we store the
      // numbers as [x, y, x, y]; but now we need to turn
      // them into [[x, y], [x, y]].
      if (points) {
        setPts(toPairs(points.toArray()));
      }
    }

    handleChange();

    if (points) {
      points.observe(handleChange);
    }

    return () => {
      if (points) {
        points.unobserve(handleChange);
      }
    };
  }, [line]);

  return { points: pts, color, isComplete };
}

export function toPairs<T>(arr: T[]): T[][] {
  let pairs: T[][] = [];

  for (let i = 0; i < arr.length - 1; i += 2) {
    pairs.push([arr[i], arr[i + 1]]);
  }

  return pairs;
}

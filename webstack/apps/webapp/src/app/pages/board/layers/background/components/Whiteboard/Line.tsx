/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, memo } from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { getStroke } from 'perfect-freehand';
import * as Y from 'yjs';

import { useHexColor, useUIStore, useUserSettings } from '@sage3/frontend';

export interface LineProps {
  line: Y.Map<any>;
  onClick: (id: string) => void;
}

export const Line = memo(function Line({ line, onClick }: LineProps) {
  const { settings } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;

  const { points, color, isComplete, alpha, size } = useLine(line);
  const c = useHexColor(color ? color : 'red');
  const hoverColor = useColorModeValue(`${color}.600`, `${color}.100`);
  const hoverC = useHexColor(hoverColor);
  const id = line.get('id') as string;
  const [hover, setHover] = useState(false);

  const handleClick = (ev: any) => {
    // If Right Click
    if ((ev.button === 2 && primaryActionMode === 'pen') || (ev.button === 0 && primaryActionMode === 'eraser')) {
      onClick(id);
    }
  };

  const pathData = getSvgPathFromStroke(
    getStroke(points, {
      size: size,
      thinning: 0.5,
      smoothing: 0.6,
      streamline: 0.2, // don't need much since already optimzed
      last: isComplete,
    })
  );

  return (
    <g>
      <path
        className="canvas-line"
        d={pathData}
        fill={hover ? hoverC : c}
        fillOpacity={alpha}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onMouseDown={handleClick}
      />
    </g>
  );
});

function average(a: number, b: number) {
  return (a + b) / 2;
}

function getSvgPathFromStroke(points: number[][]) {
  const len = points.length;

  if (len < 4) {
    return ``;
  }

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${b[0].toFixed(1)},${b[1].toFixed(1)} ${average(b[0], c[0]).toFixed(1)},${average(
    b[1],
    c[1]
  ).toFixed(1)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(1)},${average(a[1], b[1]).toFixed(1)} `;
  }

  return result;
}

function getSvgPathFromStrokeOLD(stroke: number[][]) {
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
  const [isComplete, setIsComplete] = useState<boolean>();
  const [color, setColor] = useState<string>();
  const [pts, setPts] = useState<number[][]>([]);
  const [alpha, setAlpha] = useState<number>(0.6);
  const [size, setSize] = useState<number>(5);

  // Subscribe to changes to the line itself and sync
  // them into React state.
  useEffect(() => {
    function handleChange() {
      const current = line.toJSON();
      setIsComplete(current.isComplete);
      setColor(current.userColor);
      setAlpha(current.alpha);
      setSize(current.size);
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

  return { points: pts, color, isComplete, alpha, size };
}

export function toPairs<T>(arr: T[]): T[][] {
  let pairs: T[][] = [];

  for (let i = 0; i < arr.length - 1; i += 2) {
    pairs.push([arr[i], arr[i + 1]]);
  }

  return pairs;
}

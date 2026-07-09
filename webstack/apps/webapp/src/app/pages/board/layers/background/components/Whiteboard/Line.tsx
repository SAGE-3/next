/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useMemo, memo } from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { getStroke } from 'perfect-freehand';
import * as Y from 'yjs';


import { useHexColor, useUserSettings } from '@sage3/frontend';

/**
 * The presentational data needed to render a single annotation shape.  This is
 * intentionally decoupled from Yjs so the same renderer can draw both
 * finalized shapes (backed by a Y.Map) and the local, in-progress draft stroke
 * held in React state while the user is drawing.
 */
export interface ShapeViewProps {
  points: number[][];
  color?: string;
  isComplete?: boolean;
  alpha?: number;
  size?: number;
  type?: string;
  text?: string;
  /** When false, the shape is a non-interactive preview (no hover/erase/text edit). */
  interactive?: boolean;
  onErase?: () => void;
  onTextChange?: (value: string) => void;
}

/**
 * Pure renderer for an annotation shape.  Contains no Yjs coupling; all inputs
 * arrive as plain props.  Freehand stroke geometry is memoized so that finalized
 * strokes are not re-tessellated on every render (e.g. on hover).
 */
export const ShapeView = memo(function ShapeView(props: ShapeViewProps) {
  const {
    points,
    color,
    isComplete,
    alpha,
    size,
    type = 'line',
    text = '',
    interactive = true,
    onErase,
    onTextChange,
  } = props;

  const { settings } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;

  const c = useHexColor(color ? color : 'red');
  const hoverColor = useColorModeValue(`${color}.600`, `${color}.100`);
  const hoverC = useHexColor(hoverColor);
  const [hover, setHover] = useState(false);
  const strokeColor = interactive && hover ? hoverC : c;

  // Memoize the freehand stroke outline so finalized strokes are computed once
  // and reused across re-renders (hover, sibling updates).  For an in-progress
  // draft this recomputes as points change, which is expected and local-only.
  const strokeOutline = useMemo(
    () =>
      getStroke(points, {
        size: size,
        thinning: 0.35, // a bit less 'brushy'
        smoothing: 0.2, // LOWER -> less rounding
        streamline: 0.12, // LOWER -> tracks pointer more tightly
        last: isComplete,
      }),
    [points, size, isComplete]
  );
  const pathData = useMemo(() => getSvgPathFromStrokePolygon(strokeOutline), [strokeOutline]);

  const handleErase = (ev: any) => {
    // Left-click while in eraser mode deletes this shape
    if (interactive && ev.button === 0 && primaryActionMode === 'eraser') {
      onErase?.();
    }
  };

  const hoverProps = interactive
    ? {
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        onMouseDown: handleErase,
      }
    : {};

  if (type === 'circle') {
    if (!points || points.length < 2) return null;
    try {
      const x1 = points[0][0];
      const y1 = points[0][1];
      const x0 = points[1][0];
      const y0 = points[1][1];
      const maxX = Math.max(x0, x1);
      const minX = Math.min(x0, x1);
      const maxY = Math.max(y0, y1);
      const minY = Math.min(y0, y1);
      const midpointX = (maxX + minX) / 2;
      const midpointY = (maxY + minY) / 2;
      return (
        <g>
          <ellipse
            cx={midpointX}
            cy={midpointY}
            rx={(maxX - minX) / 2}
            ry={(maxY - minY) / 2}
            fill="none"
            stroke={strokeColor}
            strokeOpacity={alpha ?? 0.6}
            strokeWidth={size ?? 5}
            strokeLinejoin="miter"   // <-- sharp corners
            strokeLinecap="butt"     // <-- flat line ends
            shapeRendering="crispEdges"
            {...hoverProps}
          />
          {interactive && (
            <foreignObject x={minX} y={minY} width={maxX - minX} height={maxY - minY}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <input
                  type="text"
                  value={text}
                  style={{
                    width: '90%',
                    height: '90%',
                    background: 'transparent',
                    border: 'none',
                    color: c,
                    fontSize: '50px',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                  onChange={(ev) => onTextChange?.(ev.target.value)}
                />
              </div>
            </foreignObject>
          )}
        </g>
      );
    } catch (error) {
      console.log(`${error}`);
    }
  }

  // --- Render rectangles with crisp right angles ---------------------------

  if (type === 'rectangle') {
    if (!points || points.length === 0) return null;

    // Compute bounding box from whatever points we have (robust to closed poly or 2-point form)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const width = Math.max(0, maxX - minX);
    const height = Math.max(0, maxY - minY);
    return (
      <g>
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="none"
          stroke={strokeColor}
          strokeOpacity={alpha ?? 0.6}
          strokeWidth={size ?? 5}
          strokeLinejoin="miter"   // Sharp corners
          strokeLinecap="butt"     // Flat line ends
          shapeRendering="crispEdges"
          {...hoverProps}
        />
        {interactive && (
          <foreignObject x={minX} y={minY} width={width} height={height}>
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input
                type="text"
                value={text}
                style={{
                  width: '90%',
                  height: '90%',
                  background: 'transparent',
                  border: 'none',
                  color: c,
                  fontSize: '50px',
                  textAlign: 'center',
                  outline: 'none',
                }}
                onChange={(ev) => onTextChange?.(ev.target.value)}
              />
            </div>
          </foreignObject>
        )}
      </g>
    );
  }

  if (type === 'arrow') {
    if (!points || points.length < 2) return null;
    try {
      const x1 = points[0][0];
      const y1 = points[0][1];
      const x2 = points[1][0];
      const y2 = points[1][1];
      return (
        <g opacity={alpha}>
          <defs>
            <marker
              id={`${x1},${y1},${x2},${y2}`}
              orient="auto"
              markerWidth="5"
              markerHeight="5"
              viewBox="0 0 10 10"
              refX="5"   // place the tip (10,5) on the vertex
              refY="5"
            >
              <path d="M0 0 L10 5 L0 10 Z" fill={strokeColor} />
            </marker>
          </defs>
          <path
            className="line"
            d={`M ${x1},${y1}, L ${x2},${y2}`}
            stroke={strokeColor}
            strokeWidth={size}
            strokeLinecap="round"
            markerEnd={`url(#${x1},${y1},${x2},${y2})`}
            {...hoverProps}
          />
        </g>
      );
    } catch (e) {
      console.log('Error rendering arrow:', e);
    }
  }

  if (type === 'doubleArrow') {
    if (!points || points.length < 2) return null;
    try {
      const x1 = points[0][0];
      const y1 = points[0][1];
      const x2 = points[1][0];
      const y2 = points[1][1];
      return (
        <g opacity={alpha}>
          <defs>
            <marker
              id={`${x1},${y1},${x2},${y2}`}
              orient="auto-start-reverse"
              markerWidth="5"
              markerHeight="5"
              viewBox="0 0 10 10"
              refX="4"   // place the tip (10,5) on the vertex
              refY="5"
            >
              <path d="M0 0 L10 5 L0 10 Z" fill={strokeColor} />
            </marker>
          </defs>
          <path
            className="line"
            d={`M ${x1},${y1}, L ${x2},${y2}`}
            stroke={strokeColor}
            strokeWidth={size}
            strokeLinecap="round"
            markerEnd={`url(#${x1},${y1},${x2},${y2})`}
            markerStart={`url(#${x1},${y1},${x2},${y2})`}
            {...hoverProps}
          />
        </g>
      );
    } catch (e) {
      console.log('Error rendering double arrow:', e);
    }
  }

  // --- Freehand line -------------------------------------------------------
  return (
    <g>
      <path className="canvas-line" d={pathData} fill={strokeColor} fillOpacity={alpha} {...hoverProps} />
    </g>
  );
});

export interface LineProps {
  line: Y.Map<any>;
  onClick: (id: string) => void;
}

/**
 * A finalized annotation shape backed by a Y.Map.  Subscribes to the Yjs
 * document for its geometry/metadata and renders via the shared ShapeView.
 */
export const Line = memo(function Line({ line, onClick }: LineProps) {
  const { points, color, isComplete, alpha, size, type, text } = useLine(line);
  const id = line.get('id') as string;

  return (
    <ShapeView
      points={points}
      color={color}
      isComplete={isComplete}
      alpha={alpha}
      size={size}
      type={type}
      text={text}
      interactive={true}
      onErase={() => onClick(id)}
      onTextChange={(value) => line.set('text', value)}
    />
  );
});

function getSvgPathFromStrokePolygon(stroke: number[][]) {
  // Build a polygonal path (no quadratic beziers) for crisper corners.  Use
  // RELATIVE line commands ('l'): outline vertices are close together, so the
  // deltas are tiny compared to absolute board coordinates (which can be 7+
  // digits on a 3,000,000-unit board), yielding a much shorter `d` string.
  // Each delta is the difference between consecutive points rounded to 0.1, and
  // the rounded position is carried forward, so there is no accumulation drift.
  if (!stroke || stroke.length === 0) return '';
  let px = Math.round(stroke[0][0] * 10) / 10;
  let py = Math.round(stroke[0][1] * 10) / 10;
  let d = `M${px.toFixed(1)},${py.toFixed(1)}`;
  for (let i = 1; i < stroke.length; i++) {
    const cx = Math.round(stroke[i][0] * 10) / 10;
    const cy = Math.round(stroke[i][1] * 10) / 10;
    d += `l${(cx - px).toFixed(1)},${(cy - py).toFixed(1)}`;
    px = cx;
    py = cy;
  }
  d += 'z';
  return d;
}

export function useLine(line: Y.Map<any>) {
  const [isComplete, setIsComplete] = useState<boolean>();
  const [color, setColor] = useState<string>();
  const [pts, setPts] = useState<number[][]>([]);
  const [alpha, setAlpha] = useState<number>(0.6);
  const [size, setSize] = useState<number>(5);
  const [type, setType] = useState<string>('line');
  const [text, setText] = useState<string>('');

  // Subscribe to changes to the line itself and sync into React state.
  useEffect(() => {
    function handleChange() {
      const current = line.toJSON();
      setIsComplete(current.isComplete);
      setColor(current.userColor);
      setAlpha(current.alpha);
      setSize(current.size);
      setType(current.type || 'line'); // read 'type' ('line' | 'rectangle')
      setText(current.text);
    }

    handleChange();
    line.observe(handleChange);

    return () => {
      line.unobserve(handleChange);
    };
  }, [line]);

  // Subscribe to changes in the line's points array and sync into React state.
  useEffect(() => {
    const points = line.get('points') as Y.Array<number>;

    function handleChange() {
      // Stored as [x, y, x, y, ...] -> convert to [[x,y], [x,y], ...]
      if (points) {
        setPts(toPairs(points.toArray()));
      }
    }

    handleChange();

    if (points) points.observe(handleChange);
    return () => {
      if (points) points.unobserve(handleChange);
    };
  }, [line]);

  return { points: pts, color, isComplete, alpha, size, type, text };
}

/**
 * Converts an array into an array of pairs by grouping consecutive elements.
 *
 * @template T - The type of elements in the input array
 * @param arr - The input array to be converted into pairs
 * @returns An array of pairs, where each pair is a two-element array containing consecutive elements from the input array
 */
export function toPairs<T>(arr: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < arr.length - 1; i += 2) {
    pairs.push([arr[i], arr[i + 1]]);
  }
  return pairs;
}

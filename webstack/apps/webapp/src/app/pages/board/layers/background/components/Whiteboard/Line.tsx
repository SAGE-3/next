/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, memo } from 'react';
import { AbsoluteCenter, propNames, useColorModeValue } from '@chakra-ui/react';
import { getStroke } from 'perfect-freehand';
import * as Y from 'yjs';


import { useHexColor, useUserSettings, useAnnotationStore, useAppStore } from '@sage3/frontend';

export interface LineProps {
  line: Y.Map<any>;
  onClick: (id: string) => void;
}

export const Line = memo(function Line({ line, onClick }: LineProps) {
  const { settings } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;

  const { points, color, isComplete, alpha, size, type, text } = useLine(line);

  const c = useHexColor(color ? color : 'red');
  const hoverColor = useColorModeValue(`${color}.600`, `${color}.100`);
  const hoverC = useHexColor(hoverColor);
  const id = line.get('id') as string;
  const [hover, setHover] = useState(false);
  const updateAnnotation = useAnnotationStore((state) => state.update);

  const handleTextChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    line.set('text', ev.target.value);
  }

  const handleClick = (ev: any) => {
    // Left-click while in eraser mode deletes this line/shape
    if (ev.button === 0 && primaryActionMode === 'eraser') {
      onClick(id);
      console.log(`LINE |click: primaryActionMode=${primaryActionMode}`);
    }
  };

  if(type === 'circle'){
    if (!points || points.length < 2) return null;
    try{
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
    return(
      <g>
        <ellipse
          cx={midpointX}
          cy={midpointY}
          rx={(maxX - minX) / 2}
          ry={(maxY - minY) / 2}
          fill="none"
          stroke={hover ? hoverC : c}
          strokeOpacity={alpha ?? 0.6}
          strokeWidth={size ?? 5}
          strokeLinejoin="miter"   // <-- sharp corners
          strokeLinecap="butt"     // <-- flat line ends
          shapeRendering="crispEdges"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onMouseDown={handleClick}
        />
        <foreignObject x={minX} y={minY} width={maxX-minX} height={maxY-minY}>
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <input
              type='text'
              value={text}
              style={{
                width: '90%',
                height: '90%',
                background: 'transparent',
                border: 'none',
                color: c,
                fontSize: '50px',
                textAlign: 'center',
                outline: 'none'
              }}
              onChange={handleTextChange}
            />
          </div>
        </foreignObject>
      </g>
    );
  } catch (error) {
    console.log(`${error}`)
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
          stroke={hover ? hoverC : c}
          strokeOpacity={alpha ?? 0.6}
          strokeWidth={size ?? 5}
          strokeLinejoin="miter"   // <-- sharp corners
          strokeLinecap="butt"     // <-- flat line ends
          shapeRendering="crispEdges"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onMouseDown={handleClick}
        />
        <foreignObject x={minX} y={minY} width={width} height={height}>
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <input
              type='text'
              value={text}
              style={{
                width: '90%',
                height: '90%',
                background: 'transparent',
                border: 'none',
                color: c,
                fontSize: '50px',
                textAlign: 'center',
                outline: 'none'
              }}
              onChange={handleTextChange}
            />
          </div>
        </foreignObject>
        </g>
    );
  }

    // --- Render freehand lines with LESS rounding ----------------------------
  // Use perfect-freehand to build the stroke outline, but:
  //  - Lower smoothing and streamline to reduce roundness
  //  - Build a polygonal path (M/L + Z) instead of quadratic curves
  const strokeOutline = getStroke(points, {
    size: size,
    thinning: 0.35,     // a bit less 'brushy'
    smoothing: 0.2,     // LOWER -> less rounding than your 0.6
    streamline: 0.12,   // LOWER -> tracks pointer more tightly
    last: isComplete,
  });

  const pathData = getSvgPathFromStrokePolygon(strokeOutline);

  if (type === 'arrow') {
    if (!points || points.length < 2) return null;

    // Compute bounding box from whatever points we have (robust to closed poly or 2-point form)
    try{
    const x1 = points[0][0];
    const y1 = points[0][1];
    const x2 = points[1][0];
    const y2 = points[1][1];

    return (
       <g opacity={alpha}>
          <defs>
            <marker 
            // unique ID for every marker head
            id={`${x1},${y1},${x2},${y2}`}
            orient="auto" 
            markerWidth="10"
            markerHeight="10"
            viewBox="0 0 10 10"
            refX="9"   // place the tip (10,5) on the vertex
            refY="5"
            >
              <path d="M0 0 L10 5 L0 10 Z" fill={hover ? hoverC : c}/>
            </marker>
          </defs>

          <path
          className="line"
          d={`M ${x1},${y1}, L ${x2},${y2}`}
          stroke={hover ? hoverC : c}
          strokeWidth={size}
          strokeLinecap='round'
          markerEnd={`url(#${x1},${y1},${x2},${y2})`}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onMouseDown={handleClick}
          />
      </g>
    );} catch(e){
      console.log("Error rendering arrow:", e);
    }
  }

  if (type === 'doubleArrow') {
    if (!points || points.length < 2) return null;

    // Compute bounding box from whatever points we have (robust to closed poly or 2-point form)
    try {
    const x1 = points[0][0];
    const y1 = points[0][1];
    const x2 = points[1][0];
    const y2 = points[1][1];

    return (
       <g opacity={alpha}>
          <defs>
            <marker 
            // unique ID for every marker head
            id={`${x1},${y1},${x2},${y2}`}
            orient="auto-start-reverse" 
            markerWidth="5"
            markerHeight="5"
            viewBox="0 0 10 10"
            refX="4"   // place the tip (10,5) on the vertex
            refY="5"
            >
              <path d="M0 0 L10 5 L0 10 Z" fill={hover ? hoverC : c}/>
            </marker>
          </defs>

          <path
          className="line"
          d={`M ${x1},${y1}, L ${x2},${y2}`}
          stroke={hover ? hoverC : c}
          strokeWidth={size}
          strokeLinecap='round'
          markerEnd={`url(#${x1},${y1},${x2},${y2})`}
          markerStart={`url(#${x1},${y1},${x2},${y2})`}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onMouseDown={handleClick}
          />
      </g>
    );
    } catch(e){
      console.log("Error rendering double arrow:", e);
    }
  }

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

function getSvgPathFromStrokePolygon(stroke: number[][]) {
  // Build a polygonal path (no quadratic beziers) for crisper corners
  if (!stroke || stroke.length === 0) return '';
  let d = `M${stroke[0][0].toFixed(1)},${stroke[0][1].toFixed(1)}`;
  for (let i = 1; i < stroke.length; i++) {
    const [x, y] = stroke[i];
    d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
  }
  d += ' Z';
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
      setType(current.type || 'line'); // <-- read 'type' ('line' | 'rectangle')
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

export function toPairs<T>(arr: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < arr.length - 1; i += 2) {
    pairs.push([arr[i], arr[i + 1]]);
  }
  return pairs;
}

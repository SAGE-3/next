/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Arrow library
import { getBoxToBoxArrow } from 'perfect-arrows';

import { useHexColor } from '@sage3/frontend';
import { Position, Size } from '@sage3/shared/types';

type Box = {
  position: Position;
  size: Size;
};

// Create an arrow from a box to the cursor position
export function BoxToCursorArrow(box: Box, posX: number, posY: number, strokeColor: string, arrowColor: string) {
  const cursorBox = {
    position: { x: posX, y: posY, z: 0 },
    size: { width: 1, height: 1, depth: 0 },
  };
  return createArrow(box, cursorBox, `cursor-arrow`, strokeColor, 'solid', arrowColor);
}

/**
 * Builds an SVG arrow between two applications based on their positions and sizes.
 *
 * @param {App} app1 - The first application object containing position and size data.
 * @param {App} app2 - The second application object containing position and size data.
 * @param {string} strokeColor - The color of the arrow's stroke.
 * @param {string} tipColor - The color of the arrow's tip.
 * @param {string} dotColor - The color of the starting dot.
 * @returns {JSX.Element} An SVG group element containing the arrow path, tip, and starting dot.
 *
 * The function calculates the arrow path using the `getBoxToBoxArrow` function. If an error occurs during
 * the calculation, it falls back to using the `getArrow` function for a corner-to-corner arrow.
 *
 * @throws Will log an error message if arrow calculation fails and falls back to corner-to-corner arrow.
 */
export function BoxToBoxArrow(
  sourceBox: Box,
  targetBox: Box,
  key: string,
  strokeColor: string,
  strokeType: 'dashed' | 'solid' = 'dashed',
  arrowColor: string,
  scale: number,
  onClick?: () => any
) {
  return createArrow(sourceBox, targetBox, key, strokeColor, strokeType, arrowColor, scale, onClick);
}

function createArrow(
  box1: Box,
  box2: Box,
  key: string,
  strokeColor: string,
  strokeType: 'dashed' | 'solid' = 'dashed',
  arrowColor: string,
  scale: number = 1,
  onClick?: () => any
) {
  const p0x = Math.round(box1.position.x);
  const p0y = Math.round(box1.position.y);
  const p1x = Math.round(box2.position.x);
  const p1y = Math.round(box2.position.y);
  const s0w = Math.round(box1.size.width);
  const s0h = Math.round(box1.size.height);
  const s1w = Math.round(box2.size.width);
  const s1h = Math.round(box2.size.height);

  const arrow = getBoxToBoxArrow(p0x, p0y, s0w, s0h, p1x, p1y, s1w, s1h, {
    padStart: 0, // leave at 0 - otherwise bug in lib
    padEnd: 0, // leave at 0 - otherwise bug in lib
    bow: 0.0,
    straights: true,
    stretch: 0.5,
    stretchMin: 0,
    stretchMax: 360,
    flip: false,
  });

  const [sx, sy, cx, cy, ex, ey, ae, as, ec] = arrow;
  const dx = ex - cx;
  const dy = ey - cy;
  const angleRadians = Math.atan2(dy, dx);
  const angleDegrees = angleRadians * (180 / Math.PI);

  const dist = Math.hypot(cx - sx, cy - sy);

  const arrowCount = Math.max(2, Math.min(4, Math.floor(dist / 100))); // between 2 and 6 arrows
  const dur = Math.max(1.5, Math.min(4, dist / 100)); // animation duration (in seconds)
  const delayGap = dur / arrowCount;

  const strokeColorHex = useHexColor(strokeColor);
  const arrowColorHex = useHexColor(arrowColor);
  const deleteColorHex = useHexColor('red');
  const gray = useHexColor('gray.500');

  const isInteractable = onClick ? true : false;

  const t = 0.5;
  const midX = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
  const midY = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;

  return (
    <g key={`array-${key}`}>
      <path
        id={`arrow-path-${key}`}
        d={`M${sx},${sy} Q${cx},${cy} ${ex},${ey}`}
        fill="none"
        stroke={strokeColorHex}
        strokeWidth={4 / scale}
        strokeDasharray={strokeType === 'dashed' ? `${30},${40}` : '0'}
      />
      {/* {animated &&
        Array.from({ length: arrowCount }).map((_, index) => (
          <polygon key={`animated-arrow-${key}-${index}`} points="0,-16 24,0 0,16" fill={arrowColorHex}>
            <animateMotion dur={`${dur}s`} begin={`${index * delayGap}s`} repeatCount="indefinite" rotate="auto">
              <mpath href={`#arrow-path-${key}`} />
            </animateMotion>
          </polygon>
        ))} */}

      {/* start of the arrow */}
      <circle cx={sx} cy={sy} r={10 / scale} stroke={arrowColorHex} strokeWidth={2} fill={arrowColorHex} />

      {/* end of the arrow */}
      <polygon
        points="-72,-36 -10,0 -72,36 -55,0"
        transform={`translate(${ex},${ey}) scale(${1 / scale}) rotate(${angleDegrees}) scale(0.3)`}
        stroke={arrowColorHex}
        strokeWidth={2}
        fill={arrowColorHex}
        style={
          isInteractable
            ? { pointerEvents: 'auto', touchAction: 'auto', cursor: 'pointer' }
            : { pointerEvents: 'none', touchAction: 'none' }
        }
        onClick={onClick}
      />

      {isInteractable && (
        <g
          style={{ pointerEvents: 'auto', touchAction: 'auto', cursor: 'pointer' }}
          onClick={onClick}
          transform={`translate(${midX}, ${midY}) scale(${1 / scale}) translate(${-midX}, ${-midY})`}
        >
          {/* Background circle */}
          <circle cx={midX} cy={midY} r={14} fill="white" stroke={deleteColorHex} strokeWidth={2} />
          {/* X lines */}
          <line x1={midX - 6} y1={midY - 6} x2={midX + 6} y2={midY + 6} stroke={deleteColorHex} strokeWidth={4} strokeLinecap="round" />
          <line x1={midX + 6} y1={midY - 6} x2={midX - 6} y2={midY + 6} stroke={deleteColorHex} strokeWidth={4} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Arrow library
import { getBoxToBoxArrow } from 'perfect-arrows';
import { useState } from 'react';
import { FaUnlink } from 'react-icons/fa';

import { useHexColor, useUserSettings } from '@sage3/frontend';
import { Position, Size } from '@sage3/shared/types';

type Box = {
  position: Position;
  size: Size;
};

// Component wrapper for the delete button group with hover state
function DeleteButtonGroup({ onClick, deleteColorHex, midX, midY }: { onClick: () => void; deleteColorHex: string; midX: number; midY: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const scale = isHovered ? 1.15 : 1;
  const iconSize = 24;
  const circleRadius = 20;
  const containerSize = circleRadius * 2 + 4; // Add some padding

  
  
  return (
    <foreignObject 
      x={midX - containerSize / 2} 
      y={midY - containerSize / 2} 
      width={containerSize} 
      height={containerSize}
      style={{ pointerEvents: 'auto', touchAction: 'auto', overflow: 'visible' }}
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transform: `scale(${scale})`,
          transformOrigin: 'center',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Background circle - subtle gray */}
        <div
          style={{
            position: 'absolute',
            width: circleRadius * 2,
            height: circleRadius * 2,
            borderRadius: '50%',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            opacity: 1,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
        {/* Link breaking icon */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s ease',
          }}
        >
          <FaUnlink size={iconSize} color={isHovered ? deleteColorHex : '#9ca3af'} />
        </div>
      </div>
    </foreignObject>
  );
}

// Create an arrow from a box to the cursor position
export function BoxToCursorArrow(box: Box, posX: number, posY: number, strokeColor: string, arrowColor: string, scale: number = 1) {
  const cursorBox = {
    position: { x: posX, y: posY, z: 0 },
    size: { width: 1, height: 1, depth: 0 },
  };
  return createArrow(box, cursorBox, `cursor-arrow`, strokeColor, 'solid', arrowColor, scale);
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
  onClick?: () => any,
  bowOffset: number = 0
) {
  return createArrow(sourceBox, targetBox, key, strokeColor, strokeType, arrowColor, scale, onClick, bowOffset);
}

function createArrow(
  box1: Box,
  box2: Box,
  key: string,
  strokeColor: string,
  strokeType: 'dashed' | 'solid' = 'dashed',
  arrowColor: string,
  scale: number = 1,
  onClick?: () => any,
  bowOffset: number = 0
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
    bow: 0.1 + bowOffset,
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

  const strokeColorHex = useHexColor(strokeColor);
  const deleteColorHex = useHexColor('red');

  const isInteractable = onClick ? true : false;
  const primaryActionMode = useUserSettings().settings.primaryActionMode;

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
        strokeWidth={8}
        strokeDasharray={strokeType === 'dashed' ? `45,50` : '0'}
      />


      {/* end of the arrow */}
      <polygon
        points="-50,-36 0,0 -50,36 -50,0"
        transform={`translate(${ex},${ey})  rotate(${angleDegrees}) scale(${.5})`}
        stroke={strokeColorHex}
        strokeWidth={Math.max(1, 1.5 / scale)}
        fill={strokeColorHex}
        style={
          isInteractable
            ? { pointerEvents: 'auto', touchAction: 'auto', cursor: 'pointer' }
            : { pointerEvents: 'none', touchAction: 'none' }
        }
        onClick={onClick}
      />

      {isInteractable && primaryActionMode === 'lasso' && (
        <DeleteButtonGroup onClick={onClick!} deleteColorHex={deleteColorHex} midX={midX} midY={midY} />
      )}
    </g>
  );
}

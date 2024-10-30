/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue } from '@chakra-ui/react';
// Arrow library
import { getArrow, getBoxToBoxArrow } from "perfect-arrows";

// SAGE Imports
import { useThrottleApps, useUIStore, useUserSettings, useHexColor, } from '@sage3/frontend';


/**
 * The Arrows component, showing arrows between apps.
 *
 * @param {ArrowsProps} props - The props for the Arrows component.
 * @returns {JSX.Element} The Arrows component.
 */
export function Arrows() {
  // Apps Store
  const apps = useThrottleApps(200);

  // UI Store
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const { settings } = useUserSettings();
  const showUI = settings.showUI;
  const showProvenance = settings.showProvenance;

  // Chakra Color Mode for grid color
  const gray = useColorModeValue('gray.200', 'gray.600');
  const strokeColor = useHexColor(gray);
  const dotColor = useHexColor("red.400");
  const tipColor = useHexColor("green.400");

  return ((showUI && showProvenance) &&
    <div
      className="arrows-container"
      style={{
        pointerEvents: 'none',
        touchAction: 'auto',
      }}
    >
      <svg
        id="arrows"
        className="canvas-layer"
        style={{
          position: 'absolute',
          width: boardWidth + 'px',
          height: boardHeight + 'px',
          left: 0,
          top: 0,
          cursor: 'crosshair',
        }}
      >
        {/* Apps array */}
        {apps.map((app, idx) => {
          if (app.data.state.sources && app.data.state.sources.length > 0) {
            const sources = app.data.state.sources;
            const arrows = [];
            for (let i = 0; i < sources.length; i++) {
              const src = sources[i];
              const srcApp = apps.find((a) => a._id === src);
              if (srcApp) {
                const pos0 = srcApp.data.position;
                const size0 = srcApp.data.size;
                const pos1 = app.data.position;
                const size1 = app.data.size;
                const p0x = Math.round(pos0.x);
                const p0y = Math.round(pos0.y);
                const p1x = Math.round(pos1.x);
                const p1y = Math.round(pos1.y);
                const s0w = Math.round(size0.width);
                const s0h = Math.round(size0.height);
                const s1w = Math.round(size1.width);
                const s1h = Math.round(size1.height);
                try {
                  // Automatically calculate the arrow
                  const arrow = getBoxToBoxArrow(p0x, p0y, s0w, s0h, p1x, p1y, s1w, s1h, {
                    bow: 0.1,
                    padStart: 20,
                    padEnd: 40,
                    stretchMin: 40,
                    stretchMax: 300,
                    stretch: 0.5,
                  });

                  // For bottom right corner to top left corner arrow
                  // const arrow = getArrow(p0x + s0w + 20, p0y + s0h + 20, p1x, p1y, {
                  //   bow: 0.1,
                  //   padStart: 0,
                  //   padEnd: 40,
                  //   stretchMin: 40,
                  //   stretchMax: 300,
                  //   stretch: 0.5,
                  // });

                  const [sx, sy, cx, cy, ex, ey, ae, as, ec] = arrow;
                  const endAngleAsDegrees = ae * (180 / Math.PI);
                  arrows.push(<g key={`array-${srcApp._id}-${app._id}`}>
                    <path d={`M${sx},${sy} Q${cx},${cy} ${ex},${ey}`} fill="none" stroke={strokeColor}
                      strokeWidth={10} />
                    <polygon
                      points="0,-6 12,0, 0,6"
                      transform={`translate(${ex},${ey}) rotate(${endAngleAsDegrees})`}
                      stroke={tipColor}
                      strokeWidth={8}
                      fill="blue"
                    />
                    <circle cx={sx} cy={sy} r={8} fill={dotColor} />
                  </g>);


                } catch (e) {
                  console.log('Error in arrow calculation. Using corner to corner arrow instead.', e);
                  const arrow = getArrow(p0x, p0y, p1x, p1y, {
                    bow: 0.2,
                    padStart: 20,
                    padEnd: 40,
                    stretchMin: 40,
                    stretchMax: 420,
                    stretch: 0.5,
                  });
                  const [sx, sy, cx, cy, ex, ey, ae, as, ec] = arrow;
                  const endAngleAsDegrees = ae * (180 / Math.PI);
                  arrows.push(<g key={`array-${srcApp._id}-${app._id}`}>
                    <path d={`M${sx},${sy} Q${cx},${cy} ${ex},${ey}`} fill="none" stroke={strokeColor}
                      strokeWidth={10} />
                    <polygon
                      points="0,-6 12,0, 0,6"
                      transform={`translate(${ex},${ey}) rotate(${endAngleAsDegrees})`}
                      stroke={tipColor}
                      strokeWidth={8}
                      fill="blue"
                    />
                    <circle cx={sx} cy={sy} r={8} fill={dotColor} />
                  </g>);
                }
              }
            }
            if (arrows.length > 0) {
              return arrows;
            } else {
              return null;
            }
          } else {
            return null;
          }
        })}
      </svg>

    </div>
  );
}

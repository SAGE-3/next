/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue } from '@chakra-ui/react';
// Arrow library
import { getBoxToBoxArrow } from 'perfect-arrows';

// SAGE Imports
import { useThrottleApps, useUIStore, useUserSettings, useHexColor, useCursorBoardPosition, useAppStore } from '@sage3/frontend';
import { App } from '@sage3/applications/schema';

// Keep seperate to avoid unnecessary rerenders caused by cursor movement
export function ArrowToCursor() {
  const linkedAppId = useUIStore((state) => state.linkedAppId);
  const apps = useThrottleApps(200);

  // UI Store
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);

  // User Cursor
  const { boardCursor: cursorPosition } = useCursorBoardPosition();

  // Chakra Color Mode for grid color
  const gray = useColorModeValue('gray.200', 'gray.600');
  const strokeColor = useHexColor(gray);
  const dotColor = useHexColor('red.400');
  const tipColor = useHexColor('green.400');

  function buildArrow(src: string) {
    const srcApp = apps.find((a) => a._id === src);

    if (srcApp) {
      return buildArrowToCursor(srcApp, cursorPosition.x, cursorPosition.y, strokeColor, tipColor, dotColor);
    }
    return null;
  }
  return (
    <>
      {linkedAppId && (
        <div className="arrows-container" style={{ pointerEvents: 'none', touchAction: 'auto' }}>
          <svg
            id="arrows-to-cursor"
            className="canvas-layer"
            style={{
              position: 'absolute',
              width: boardWidth + 'px',
              height: boardHeight + 'px',
              left: 0,
              top: 0,
              zIndex: 0,
            }}
          >
            {buildArrow(linkedAppId)}
          </svg>
        </div>
      )}
    </>
  );
}
/**
 * The Arrows component, showing arrows between apps.
 *
 * @param {ArrowsProps} props - The props for the Arrows component.
 * @returns {JSX.Element} The Arrows component.
 */
export function Arrows() {
  // Apps Store
  const apps = useThrottleApps(200);
  const selectedApps = useUIStore((state) => state.selectedAppsIds);
  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const candidates = selectedAppId ? [selectedAppId] : selectedApps;
  const appCandidates = apps.filter((a) => candidates.includes(a._id));

  // UI Store
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const { settings } = useUserSettings();
  const showUI = settings.showUI;
  const showProvenance = settings.showProvenance;
  const primaryActionMode = settings.primaryActionMode;

  // Chakra Color Mode for grid color
  const gray = useColorModeValue('gray.200', 'gray.600');
  const strokeColor = useHexColor(gray);
  const dotColor = useHexColor('red.400');
  const tipColor = useHexColor('green.400');
  const arrows: JSX.Element[] = [];

  // Linker Interaction Mode
  const linkedAppId = useUIStore((state) => state.linkedAppId);
  const updateState = useAppStore((state) => state.updateState);

  function deleteLink(app1: App, app2: App) {
    const newSources = app2.data.state.sources.filter((source: string) => source !== app1._id);
    updateState(app2._id, { sources: newSources });
  }

  if (showUI && (showProvenance === 'all' || primaryActionMode === 'linker')) {
    return (
      <div className="arrows-container" style={{ pointerEvents: 'none', touchAction: 'auto' }}>
        <svg
          id="arrows"
          className="canvas-layer"
          style={{
            position: 'absolute',
            width: boardWidth + 'px',
            height: boardHeight + 'px',
            left: 0,
            top: 0,
            zIndex: 0,
          }}
        >
          {/* All arrows */}
          {apps.map((app) => {
            if (app.data.state.sources && app.data.state.sources.length > 0) {
              const sources = app.data.state.sources;

              for (let i = 0; i < sources.length; i++) {
                const src = sources[i];
                const srcApp = apps.find((a) => a._id === src);
                if (srcApp) {
                  const arrow = buildArrow(
                    srcApp,
                    app,
                    strokeColor,
                    tipColor,
                    dotColor,
                    linkedAppId === '' && primaryActionMode === 'linker',
                    linkedAppId === '' && primaryActionMode === 'linker'
                      ? () => {
                          deleteLink(srcApp, app);
                        }
                      : undefined
                  );
                  arrows.push(arrow);
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
  } else if (showUI && showProvenance === 'selected') {
    return (
      <div className="arrows-container" style={{ pointerEvents: 'none', touchAction: 'auto' }}>
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
          {/* Arrows to destinations */}
          {appCandidates.map((ac) => {
            return apps.map((app) => {
              if (app.data.state.sources && app.data.state.sources.length > 0) {
                const sources = app.data.state.sources;

                if (sources.includes(ac._id)) {
                  const srcApp = apps.find((a) => a._id === ac._id);
                  if (srcApp) {
                    const arrow = buildArrow(srcApp, app, strokeColor, tipColor, dotColor);
                    arrows.push(arrow);
                  }
                }
              }
            });
          })}

          {/* Arrows to sources */}
          {apps.map((app) => {
            if (selectedAppId !== app._id && !selectedApps.includes(app._id)) return null;
            if (app.data.state.sources && app.data.state.sources.length > 0) {
              const sources = app.data.state.sources;
              const arrows = [];

              for (let i = 0; i < sources.length; i++) {
                const src = sources[i];
                const srcApp = apps.find((a) => a._id === src);
                if (srcApp) {
                  const arrow = buildArrow(srcApp, app, strokeColor, tipColor, dotColor);
                  arrows.push(arrow);
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

          {arrows}
        </svg>
      </div>
    );
  } else {
    return null;
  }
}

type Box = {
  pos: { x: number; y: number };
  size: { width: number; height: number };
};

/**
 * Builds an SVG arrow between two boxes based on their positions and sizes.
 *
 * @param {Box} box1 - The first box object containing position and size data.
 * @param {Box} box2 - The second box object containing position and size data.
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
function createArrow(
  box1: Box,
  box2: Box,
  key: string,
  strokeColor: string,
  tipColor: string,
  dotColor: string,
  interactable: boolean = false,
  onClick?: () => any
) {
  const p0x = Math.round(box1.pos.x);
  const p0y = Math.round(box1.pos.y);
  const p1x = Math.round(box2.pos.x);
  const p1y = Math.round(box2.pos.y);
  const s0w = Math.round(box1.size.width);
  const s0h = Math.round(box1.size.height);
  const s1w = Math.round(box2.size.width);
  const s1h = Math.round(box2.size.height);

  const arrow = getBoxToBoxArrow(p0x, p0y, s0w, s0h, p1x, p1y, s1w, s1h, {
    padStart: 0, // leave at 0 - otherwise bug in lib
    padEnd: 0, // leave at 0 - otherwise bug in lib
    bow: 0.25,
    straights: true,
    stretch: 0.5,
    stretchMin: 0,
    stretchMax: 360,
    flip: false,
  });

  const [sx, sy, cx, cy, ex, ey, ae, as, ec] = arrow;
  const endAngleAsDegrees = ae * (180 / Math.PI);

  return (
    <g key={`array-${key}`}>
      <path
        d={`M${sx},${sy} Q${cx},${cy} ${ex},${ey}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={10}
        style={interactable ? { pointerEvents: 'auto', touchAction: 'auto' } : { pointerEvents: 'none', touchAction: 'none' }}
        onClick={onClick}
        onMouseEnter={(e) => {
          if (!interactable) return;

          (e.target as SVGPathElement).setAttribute('stroke', 'red');
        }}
        onMouseLeave={(e) => {
          if (!interactable) return;

          (e.target as SVGPathElement).setAttribute('stroke', strokeColor);
        }}
      />
      <polygon
        points="-18,-6 -6,0, -18,6" // offset since no padding
        transform={`translate(${ex},${ey}) rotate(${endAngleAsDegrees})`}
        stroke={tipColor}
        strokeWidth={8}
      />
      <circle cx={sx} cy={sy} r={8} fill={dotColor} />
    </g>
  );
}

function buildArrowToCursor(app1: App, posX: number, posY: number, strokeColor: string, tipColor: string, dotColor: string) {
  return createArrow(
    { pos: app1.data.position, size: app1.data.size },
    { pos: { x: posX, y: posY }, size: { width: 1, height: 1 } },
    `${app1._id}-cursor`,
    strokeColor,
    tipColor,
    dotColor,
    false
  );
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
function buildArrow(
  app1: App,
  app2: App,
  strokeColor: string,
  tipColor: string,
  dotColor: string,
  interactable: boolean = false,
  onClick?: () => any
) {
  return createArrow(
    { pos: app1.data.position, size: app1.data.size },
    { pos: app2.data.position, size: app2.data.size },
    `${app1._id}-${app2._id}`,
    strokeColor,
    tipColor,
    dotColor,
    interactable,
    onClick
  );
}

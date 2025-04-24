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
import {
  useThrottleApps,
  useUIStore,
  useUserSettings,
  useHexColor,
  useCursorBoardPosition,
  useAppStore,
  useLinkStore,
} from '@sage3/frontend';
import { App } from '@sage3/applications/schema';
import { useEffect, useState } from 'react';
import { ca } from 'date-fns/locale';
import { Link } from '@sage3/shared/types';

// Keep seperate to avoid unnecessary rerenders caused by cursor movement
export function ArrowToCursor() {
  const linkedAppId = useLinkStore((state) => state.linkedAppId);
  return <>{linkedAppId && <ArrowToCursorMain linkedAppId={linkedAppId} />}</>;
}

export function ArrowToCursorMain({ linkedAppId }: { linkedAppId: string }) {
  // const linkedAppId = useUIStore((state) => state.linkedAppId);
  const apps = useThrottleApps(200);

  // UI Store
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const boardSynced = useUIStore((state) => state.boardSynced);

  // User Cursor
  // const { boardCursor: cursorPosition } = useCursorBoardPosition();
  const { uiToBoard } = useCursorBoardPosition();
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: -1, y: -1 });

  // Chakra Color Mode for grid color
  const gray = useColorModeValue('gray.200', 'gray.600');
  const strokeColor = useHexColor(gray);
  const dotColor = useHexColor('red.400');
  const tipColor = useHexColor('green.400');

  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      if (boardSynced) {
        setCursorPos(uiToBoard(e.clientX, e.clientY));
      }
    };

    window.addEventListener('mousemove', updateCursor, { passive: true });

    return () => {
      window.removeEventListener('mousemove', updateCursor);
    };
  }, [uiToBoard, boardSynced]);

  function buildArrow(src: string) {
    const srcApp = apps.find((a) => a._id === src);

    if (srcApp && cursorPos.x !== -1 && cursorPos.y !== -1) {
      return buildArrowToCursor(srcApp, cursorPos.x, cursorPos.y, strokeColor, tipColor, dotColor);
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
  const links = useLinkStore((state) => state.links);

  // UI Store
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const { settings } = useUserSettings();
  const showUI = settings.showUI;
  const showProvenance = settings.showProvenance;
  const primaryActionMode = settings.primaryActionMode;

  // Chakra Color Mode for grid color
  const teal = useColorModeValue('teal.200', 'teal.600');
  const strokeColor = useHexColor(teal);
  const dotColor = useHexColor('red.400');
  const tipColor = useHexColor('green.400');
  // Linker Interaction Mode
  const linkedAppId = useLinkStore((state) => state.linkedAppId);
  const removeLink = useAppStore((state) => state.delete);

  function handleDeleteLink(linkId: string) {
    removeLink(linkId);
  }

  function filterLinksToDraw(link: Link) {
    if (showUI && (showProvenance === 'all' || primaryActionMode === 'linker')) return true;
    if (showUI && showProvenance === 'selected') {
      if (candidates.includes(link.data.sourceAppId) || candidates.includes(link.data.targetAppId)) {
        return true;
      }
    }
    return false;
  }

  console.log('links', links);

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
        {links.map((link) => {
          const { data } = link;
          const { sourceAppId, targetAppId } = data;
          const srcApp = apps.find((a) => a._id === sourceAppId);
          const app = apps.find((a) => a._id === targetAppId);
          const isSageCell = app?.data.type === 'SageCell' && srcApp?.data.type === 'SageCell';

          if (!srcApp || !app) return null;

          const arrow = buildArrow(
            srcApp,
            app,
            strokeColor,
            tipColor,
            dotColor,
            isSageCell,
            linkedAppId === '' && primaryActionMode === 'linker'
              ? () => {
                  handleDeleteLink(link._id);
                }
              : undefined
          );
          return arrow;
        })}
      </svg>
    </div>
  );
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

  const dist = Math.hypot(cx - sx, cy - sy);

  const arrowCount = Math.max(2, Math.min(6, Math.floor(dist / 100))); // between 2 and 6 arrows
  const dur = Math.max(1.5, Math.min(4, dist / 100)); // animation duration (in seconds)
  const delayGap = dur / arrowCount;

  return (
    <g key={`array-${key}`}>
      <path
        id={`arrow-path-${key}`}
        d={`M${ex},${ey} Q${cx},${cy} ${sx},${sy}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={6}
        strokeDasharray="10,10"
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
      {interactable &&
        Array.from({ length: arrowCount }).map((_, index) => (
          <polygon key={`animated-arrow-${key}-${index}`} points="0,-16 24,0 0,16" fill={dotColor}>
            <animateMotion dur={`${dur}s`} begin={`${index * delayGap}s`} repeatCount="indefinite" rotate="auto">
              <mpath href={`#arrow-path-${key}`} />
            </animateMotion>
          </polygon>
        ))}
      <polygon
        points="-48,-14 -5,0, -48,14" // offset since no padding
        transform={`translate(${ex},${ey}) rotate(${endAngleAsDegrees})`}
        stroke={dotColor}
        strokeWidth={8}
        fill={dotColor}
      />
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
    { pos: app2.data.position, size: app2.data.size },
    { pos: app1.data.position, size: app1.data.size },
    `${app1._id}-${app2._id}`,
    strokeColor,
    tipColor,
    dotColor,
    interactable,
    onClick
  );
}

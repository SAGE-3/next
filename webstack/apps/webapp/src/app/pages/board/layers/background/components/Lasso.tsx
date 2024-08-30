/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';

// SAGE Imports
import { useCursorBoardPosition, useHexColor, useKeyPress, useThrottleScale, useThrottleApps, useUIStore } from '@sage3/frontend';
import { Position, Size } from '@sage3/shared/types';

type LassoProps = {
  boardId: string;
};

type BoxProps = {
  mousex: number;
  mousey: number;
  last_mousex: number;
  last_mousey: number;
  selectedApps: string[];
};

export function Lasso(props: LassoProps) {
  // Board state
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);

  // Lasso mode apps & Selected apps
  const lassoMode = useUIStore((state) => state.lassoMode);
  const selectedApps = useUIStore((state) => state.selectedAppsIds);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);

  // Mouse Positions
  const [mousedown, setMouseDown] = useState(false);
  const { uiToBoard } = useCursorBoardPosition();
  const [last_mousex, set_last_mousex] = useState(0);
  const [last_mousey, set_last_mousey] = useState(0);
  const [mousex, set_mousex] = useState(0);
  const [mousey, set_mousey] = useState(0);

  // State of cursor
  const [isDragging, setIsDragging] = useState(false);

  // Key press
  const spacebarPressed = useKeyPress(' ');

  useEffect(() => {
    // Handle if let go shift before mouse up, clear the rectangle
    if (!lassoMode && mousedown === true) {
      mouseUp();
    }
  }, [lassoMode]);

  // Get initial position
  const mouseDown = (ev: any) => {
    const position = uiToBoard(ev.clientX, ev.clientY);
    set_last_mousex(position.x);
    set_last_mousey(position.y);
    set_mousex(position.x);
    set_mousey(position.y);
    setMouseDown(true);
  };

  const mouseUp = () => {
    setMouseDown(false);
    // Deselect all aps
    if (!isDragging) {
      clearSelectedApps();
    }
    setIsDragging(false);
  };

  // Get last position
  const mouseMove = (ev: any) => {
    const position = uiToBoard(ev.clientX, ev.clientY);
    setIsDragging(true);
    set_mousex(position.x);
    set_mousey(position.y);
  };

  return (
    <>
      <div className="canvas-container" style={{ pointerEvents: lassoMode && !spacebarPressed ? 'auto' : 'none' }}>
        <svg
          className="canvas-layer"
          style={{
            position: 'absolute',
            width: boardWidth + 'px',
            height: boardHeight + 'px',
            left: 0,
            top: 0,
            zIndex: 2000,
            cursor: 'crosshair',
          }}
          onMouseDown={mouseDown}
          onMouseUp={mouseUp}
          onMouseMove={mouseMove}
        >
          {mousedown ? (
            <DrawBox mousex={mousex} mousey={mousey} last_mousex={last_mousex} last_mousey={last_mousey} selectedApps={selectedApps} />
          ) : null}
        </svg>
      </div>
    </>
  );
}

function checkContain(pos: Position, size: Size, pt: Position, size2: Size) {
  const res = pos.x > pt.x && pos.y > pt.y && pos.x + size.width < pt.x + size2.width && pos.y + size.height < pt.y + size2.height;
  return res;
}

function checkOverlap(pos: Position, size: Size, pt: Position, size2: Size) {
  // If one rectangle is on left side of other
  if (pos.x > pt.x + size2.width || pt.x > pos.x + size.width) return false;
  // If one rectangle is above other
  if (pos.y + size.height < pt.y || pt.y + size2.height < pos.y) return false;
  return true;
}

// Box for selecting apps
const DrawBox = (props: BoxProps) => {
  // Get the left side of the box
  const rx = props.mousex < props.last_mousex ? props.mousex : props.last_mousex;
  // Calculate for right side
  const width = Math.abs(props.mousex - props.last_mousex);

  // Get the top of the box
  const ry = props.mousey < props.last_mousey ? props.mousey : props.last_mousey;
  // Calculate for bottom
  const height = Math.abs(props.mousey - props.last_mousey);

  // App store
  const boardApps = useThrottleApps(250);

  // UI store
  const scale = useThrottleScale(250);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);
  const setSelectedApps = useUIStore((state) => state.setSelectedAppsIds);

  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);

  // Used only to update store once # of selected apps change
  const [clickSelectedApps, setClickSelectedApps] = useState<string[]>(props.selectedApps);
  const [rectSelectedApps, setRectSelectedApps] = useState<string[]>([]);

  // Color state
  const strokeColor = useHexColor('teal');

  // Clear slected apps
  useEffect(() => {
    clearSelectedApps();
  }, []);

  // This use effect is used to update the selected apps when the rectangle changes
  useEffect(() => {
    if (width == 0 && height == 0) return;
    // Check all apps on board
    for (const app of boardApps) {
      // Add apps as they are enveloped in box area
      // if (checkContain(app.data.position, app.data.size, { x: rx, y: ry, z: 0 }, { width, height, depth: 0 })) {

      // Add apps as they are overlap the box area
      if (checkOverlap(app.data.position, app.data.size, { x: rx, y: ry, z: 0 }, { width, height, depth: 0 })) {
        if (!rectSelectedApps.includes(app._id)) setRectSelectedApps((prev) => [...prev, app._id]);
      } else {
        // Remove apps if not in box area
        if (rectSelectedApps.includes(app._id)) {
          const newArray = rectSelectedApps;
          const index = newArray.indexOf(app._id);
          newArray.splice(index, 1);
          setRectSelectedApps([...newArray]);
        }
      }
    }
  }, [width, height, rx, ry, clickSelectedApps, boardApps]);

  // This use effect is used to update the selected apps when the user clicks on an app
  useEffect(() => {
    if (width == 0 && height == 0) {
      for (const app of boardApps) {
        // Add apps as they are enveloped in box area
        // if (checkContain(app.data.position, app.data.size, { x: rx, y: ry, z: 0 }, { width, height, depth: 0 })) {

        // Add apps as they are overlap the box area
        if (checkOverlap(app.data.position, app.data.size, { x: rx, y: ry, z: 0 }, { width, height, depth: 0 })) {
          if (!clickSelectedApps.includes(app._id)) setClickSelectedApps((prev) => [...prev, app._id]);

          if (clickSelectedApps.includes(app._id)) {
            const newArray = clickSelectedApps;
            const index = newArray.indexOf(app._id);
            newArray.splice(index, 1);
            setClickSelectedApps([...newArray]);
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    // If app is selected while starting lasso mode, clear app that is selected
    if (selectedAppId.length) {
      setSelectedApp('');
    }
    // Only update UI store when local state changes
    setSelectedApps([...rectSelectedApps, ...clickSelectedApps]);
  }, [rectSelectedApps, clickSelectedApps]);

  return (
    <rect
      style={{
        strokeWidth: 6 / scale,
        strokeDasharray: 10 / scale,
        stroke: strokeColor,
        fill: strokeColor,
        fillOpacity: 0.15,
        zIndex: 0,
      }}
      x={rx}
      y={ry}
      height={height}
      width={width}
    />
  );
};

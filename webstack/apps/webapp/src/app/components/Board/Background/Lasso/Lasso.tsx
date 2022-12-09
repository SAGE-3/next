/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';

// SAGE Imports
import { useAppStore, useCursorBoardPosition, useHexColor, useKeyPress, useUIStore } from '@sage3/frontend';

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
  const selectedApps = useUIStore((state) => state.selectedApps);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);

  // Mouse Positions
  const [mousedown, setMouseDown] = useState(false);
  const userCursor = useCursorBoardPosition();
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
  const mouseDown = () => {
    const position = userCursor.position;
    set_last_mousex(position.x);
    set_last_mousey(position.y);
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
  const mouseMove = () => {
    const position = userCursor.position;
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
            zIndex: 70,
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
  const boardApps = useAppStore((state) => state.apps);

  // UI store
  const scale = useUIStore((state) => state.scale);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);
  const setSelectedApps = useUIStore((state) => state.setSelectedApps);
  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);

  // Used only to update store once # of selected apps change
  const [localSelctedApps, setLocalSelectedApps] = useState<string[]>([]);

  // Color state
  const strokeColor = useHexColor('teal');

  // Clear slected apps
  useEffect(() => {
    clearSelectedApps();
  }, []);

  // Checks for apps on or off the pane
  useEffect(() => {
    // Check all apps on board
    for (const app of boardApps) {
      if (
        app.data.position.x > rx &&
        app.data.position.y > ry &&
        app.data.position.x + app.data.size.width < rx + width &&
        app.data.position.y + app.data.size.height < ry + height
      ) {
        // Add apps as they are envoloped in box area
        if (!localSelctedApps.includes(app._id)) setLocalSelectedApps((prev) => [...prev, app._id]);
      } else {
        // Remove apps if not in box area
        if (localSelctedApps.includes(app._id)) {
          const newArray = localSelctedApps;
          const index = newArray.indexOf(app._id);
          newArray.splice(index, 1);
          setLocalSelectedApps([...newArray]);
        }
      }
    }
  }, [width, height, rx, ry, localSelctedApps, boardApps]);

  useEffect(() => {
    // If app is selected while starting lasso mode, clear app that is selected
    if (selectedAppId.length) {
      setSelectedApp('');
    }
    // Only update UI store when local state changes
    setSelectedApps(localSelctedApps);
  }, [localSelctedApps]);

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

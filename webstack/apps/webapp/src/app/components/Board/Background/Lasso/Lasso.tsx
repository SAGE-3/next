/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Yjs Imports
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// SAGE Imports
import {
  useAppStore,
  useBoardStore,
  useCursorBoardPosition,
  useHexColor,
  useHotkeys,
  useKeyPress,
  useUIStore,
  useUser,
} from '@sage3/frontend';
import { Rnd } from 'react-rnd';
import { Box } from '@chakra-ui/react';
import { App } from '@sage3/applications/schema';

type LassoProps = {
  boardId: string;
};

type BoxProps = {
  mousex: number;
  mousey: number;
  last_mousex: number;
  last_mousey: number;
  color: string;
};

export function Lasso(props: LassoProps) {
  const { user } = useUser();

  const boardPosition = useUIStore((state) => state.boardPosition);

  const scale = useUIStore((state) => state.scale);
  const lassoMode = useUIStore((state) => state.lassoMode);

  const setLassoMode = useUIStore((state) => state.setLassoMode);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const selectedApps = useUIStore((state) => state.selectedApps);

  const updateBoard = useBoardStore((state) => state.update);
  const boards = useBoardStore((state) => state.boards);
  const board = boards.find((el) => el._id === props.boardId);
  const boardApps = useAppStore((state) => state.apps);

  const rCurrentLine = useRef<Y.Map<any>>();
  const userCursor = useCursorBoardPosition();

  const [mousedown, setMouseDown] = useState(false);
  const [last_mousex, set_last_mousex] = useState(0);
  const [last_mousey, set_last_mousey] = useState(0);
  const [mousex, set_mousex] = useState(0);
  const [mousey, set_mousey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);

  const spacebarPressed = useKeyPress(' ');
  const color = useUIStore((state) => state.markerColor);

  useEffect(() => {
    if (!lassoMode && mousedown === true) {
      mouseUp();
    }
  }, [lassoMode]);

  useHotkeys('esc', () => {
    setLassoMode(false);
  });

  const mouseDown = () => {
    const position = userCursor.position;

    set_last_mousex(position.x);
    set_last_mousey(position.y);
    setMouseDown(true);
  };

  const mouseUp = () => {
    setMouseDown(false);
    if (!isDragging) {
      clearSelectedApps();
    }
    setIsDragging(false);
  };

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
            zIndex: 0,
            cursor: 'crosshair',
          }}
          onMouseDown={mouseDown}
          onMouseUp={mouseUp}
          onMouseMove={mouseMove}
        >
          {mousedown ? (
            <AddRectangle
              mousex={mousex}
              mousey={mousey}
              last_mousex={last_mousex}
              last_mousey={last_mousey}
              color={color}
              selectedApps={selectedApps}
            />
          ) : null}
        </svg>
      </div>
    </>
  );
}

const AddRectangle = (props: any) => {
  const width = Math.abs(props.mousex - props.last_mousex);
  const height = Math.abs(props.mousey - props.last_mousey);

  const rx = props.mousex < props.last_mousex ? props.mousex : props.last_mousex;
  const ry = props.mousey < props.last_mousey ? props.mousey : props.last_mousey;
  const boardApps = useAppStore((state) => state.apps);

  const scale = useUIStore((state) => state.scale);
  const { user } = useUser();

  const strokeColor = useHexColor(user ? user.data.color : 'white');
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);
  const addSelectedApp = useUIStore((state) => state.addSelectedApp);
  const setSelectedApps = useUIStore((state) => state.setSelectedApps);
  const [localSelctedApps, setLocalSelectedApps] = useState<string[]>([]);

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
        // if (!props.selectedApps.includes(app._id)) addSelectedApp(app._id);
        if (!localSelctedApps.includes(app._id)) setLocalSelectedApps((prev) => [...prev, app._id]);
      } else {
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
    setSelectedApps(localSelctedApps);
  }, [localSelctedApps]);

  return (
    <>
      <rect
        style={{
          strokeWidth: 6 / scale,
          strokeDasharray: 10 / scale,
          stroke: strokeColor,
          fill: strokeColor,
          fillOpacity: 0.15,
          zIndex: -1,
        }}
        x={rx}
        y={ry}
        height={height}
        width={width}
      />
    </>
  );
};

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
import { useBoardStore, useCursorBoardPosition, useHotkeys, useKeyPress, useUIStore, useUser } from '@sage3/frontend';
import { Rnd } from 'react-rnd';
import { Box } from '@chakra-ui/react';

type LassoProps = {
  boardId: string;
};

export function Lasso(props: LassoProps) {
  const { user } = useUser();

  const boardPosition = useUIStore((state) => state.boardPosition);

  const scale = useUIStore((state) => state.scale);
  const lassoMode = useUIStore((state) => state.lassoMode);

  const setLassoMode = useUIStore((state) => state.setLassoMode);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const [boxes, setBoxes] = useState<{ x: number; y: number; color: string }[]>([]);

  const updateBoard = useBoardStore((state) => state.update);
  const boards = useBoardStore((state) => state.boards);
  const board = boards.find((el) => el._id === props.boardId);

  const rCurrentLine = useRef<Y.Map<any>>();
  const userCursor = useCursorBoardPosition();

  const spacebarPressed = useKeyPress(' ');
  const color = useUIStore((state) => state.markerColor);

  useHotkeys('esc', () => {
    setLassoMode(false);
  });

  // Deselect all apps
  useHotkeys(
    'shift+w',
    () => {
      setLassoMode(!lassoMode);
    },
    { dependencies: [lassoMode] }
  );

  const createBox = () => {
    console.log(userCursor.position);
    const position = userCursor.position;
    setBoxes((prev) => [...prev, { x: position.x, y: position.y, color: color }]);
  };
  // Get around  the center of the board
  const x = Math.floor(-boardPosition.x + window.innerWidth / scale / 2);
  const y = Math.floor(-boardPosition.y + window.innerHeight / scale / 2);
  const getPoint = useCallback(
    (x: number, y: number) => {
      x = x / scale;
      y = y / scale;
      return [x - boardPosition.x, y - boardPosition.y];
    },
    [boardPosition.x, boardPosition.y, scale]
  );

  // On pointer down, start a new current line
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {}, []);

  // On pointer move, update awareness and (if down) update the current line
  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {}, []);

  // On pointer up, complete the current line
  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {}, []);

  return (
    <>
      <div className="canvas-container" onClick={createBox} style={{ pointerEvents: lassoMode && !spacebarPressed ? 'auto' : 'none' }}>
        <svg
          className="canvas-layer"
          style={{
            position: 'absolute',
            width: boardWidth + 'px',
            height: boardHeight + 'px',
            left: 0,
            top: 0,
            // left: 1510918,
            // top: 1498458,
            zIndex: 200,
            cursor: 'crosshair',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {boxes.map((box, index) => {
            return <BoxOutline key={index} x={box.x} y={box.y} color={box.color} />;
          })}
        </svg>
      </div>
    </>
  );
}

type BoxOutlineProps = {
  x: number;
  y: number;
  color: string;
};

function BoxOutline(props: BoxOutlineProps) {
  return (
    <g id="group_text_1" transform={`translate(${props.x},${props.y}) `}>
      <rect x={0} y={0} stroke={'#ffffff'} fill={props.color} opacity={0.1} width="200" height="300" />
    </g>
  );
}

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

type BoxProps = {
  start: {
    x: number;
    y: number;
  };
  end: {
    x: number;
    y: number;
  };
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
  const [boxes, setBoxes] = useState<BoxProps[]>([]);

  const updateBoard = useBoardStore((state) => state.update);
  const boards = useBoardStore((state) => state.boards);
  const board = boards.find((el) => el._id === props.boardId);

  const rCurrentLine = useRef<Y.Map<any>>();
  const userCursor = useCursorBoardPosition();

  const spacebarPressed = useKeyPress(' ');
  const color = useUIStore((state) => state.markerColor);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

  const getPoint = useCallback(
    (x: number, y: number) => {
      x = x / scale;
      y = y / scale;
      return [x - boardPosition.x, y - boardPosition.y];
    },
    [boardPosition.x, boardPosition.y, scale]
  );

  // On pointer down, start a new current line
  const handlePointerDown = () => {
    setIsMouseDown(true);
    const position = userCursor.position;
    setStartPos({ x: position.x, y: position.y });
  };
  const handlePointerMove = () => {
    if (isMouseDown) {
      const position = userCursor.position;
      setEndPos({ x: position.x, y: position.y });
    }
  };
  const handlePointerUp = () => {
    setIsMouseDown(false);
    const position = userCursor.position;
    let box: any = null;
    console.log(startPos);
    if (startPos && endPos) {
      box = {
        start: {
          x: startPos.x,
          y: startPos.y,
        },
        end: {
          x: endPos.x,
          y: endPos.y,
        },
        color: color,
      };
    }
    console.log(box);
    if (box) setBoxes((prev) => [...prev, box]);
  };

  // // On pointer move, update awareness and (if down) update the current line
  // const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {}, []);

  // // On pointer up, complete the current line
  // const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
  //   const position = userCursor.position;
  // }, []);

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
            // left: 1510918,
            // top: 1498458,
            zIndex: 200,
            cursor: 'crosshair',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {isMouseDown ? <BoxOutline start={startPos} end={endPos} color={color} /> : null}

          {boxes.map((box, index) => {
            return <BoxOutline key={index} start={box.start} end={box.end} color={box.color} />;
          })}
        </svg>
      </div>
    </>
  );
}

function BoxOutline(props: BoxProps) {
  return (
    <g id="group_text_1" transform={`translate(${props.start.x},${props.start.y}) `}>
      <rect
        x={0}
        y={0}
        stroke={'#ffffff'}
        fill={props.color}
        opacity={0.1}
        width={props.end.x - props.start.x}
        height={props.end.y - props.start.y}
      />
    </g>
  );
}

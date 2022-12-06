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
import { useAppStore, useBoardStore, useCursorBoardPosition, useHotkeys, useKeyPress, useUIStore, useUser } from '@sage3/frontend';
import { Rnd } from 'react-rnd';
import { Box } from '@chakra-ui/react';

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
  const [boxes, setBoxes] = useState<BoxProps[]>([]);

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

  const spacebarPressed = useKeyPress(' ');
  const color = useUIStore((state) => state.markerColor);

  // Checks for apps on or off the pane
  useEffect(() => {
    console.log('updated');
    const width = Math.abs(mousex - last_mousex);
    const height = Math.abs(mousey - last_mousey);

    const rx = mousex < last_mousex ? mousex : last_mousex;
    const ry = mousey < last_mousey ? mousey : last_mousey;
    console.log(rx + width, rx, ry + height, ry);
    // Check all apps on board
    for (const app of boardApps) {
      // Hosted app window should fall within AI Pane window
      // Ignore apps already being hosted
      console.log(app.data.position.x, app.data.size.width, app.data.position.y, app.data.size.height);
      console.log(
        app.data.position.x > rx,
        app.data.position.x + app.data.size.width < rx + width,
        app.data.position.y + app.data.size.height < ry + height,
        app.data.size.height + app.data.position.y > ry
      );

      if (
        app.data.position.x + app.data.size.width < rx + width &&
        app.data.position.x + app.data.size.width > rx &&
        app.data.position.y + app.data.size.height < ry + height &&
        app.data.size.height + app.data.position.y > ry
      ) {
        console.log('hosting apps');
        // if (!Object.keys(s.hostedApps).includes(app._id)) {
        //   const hosted = {
        //     ...s.hostedApps,
        //     ...client,
        //   };
        //   updateState(props._id, { hostedApps: hosted });
        //   // TODO Make messages more informative rather than simply types of apps being hosted
        //   updateState(props._id, { messages: hosted });
        //   // console.log('app ' + app._id + ' added');
        //   newAppAdded(app.data.type);
        // } else {
        //   // console.log('app ' + app._id + ' already in hostedApps');
        // }
      }
      // else {
      //   if (Object.keys(s.hostedApps).includes(app._id)) {
      //     const hostedCopy = { ...s.hostedApps };
      //     delete hostedCopy[app._id];
      //     updateState(props._id, { messages: hostedCopy, hostedApps: hostedCopy });
      //   }
      // }
    }
  }, [JSON.stringify(boardApps)]);

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
    const box = {
      mousex: mousex,
      mousey: mousey,
      last_mousex: last_mousex,
      last_mousey: last_mousey,
      color: color,
    };
    if (box) setBoxes((prev) => [...prev, box]);
  };

  const mouseMove = () => {
    const position = userCursor.position;

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
            <AddRectangle mousex={mousex} mousey={mousey} last_mousex={last_mousex} last_mousey={last_mousey} color={color} />
          ) : null}
          {boxes.map((box, index) => {
            return (
              <AddRectangle
                key={index}
                mousex={box.mousex}
                mousey={box.mousey}
                last_mousex={box.last_mousex}
                last_mousey={box.last_mousey}
                color={box.color}
              />
            );
          })}
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

  return (
    <>
      <text x={rx} y={ry}>
        {rx}
      </text>
      <text x={rx + width} y={ry}>
        {rx + width}
      </text>
      <text x={rx} y={ry + height}>
        {ry}
      </text>
      <text x={rx + width} y={ry + height}>
        {ry + height}
      </text>
      <rect
        style={{ fill: props.color, strokeWidth: 30, stroke: props.color, opacity: 0.3, zIndex: -1 }}
        x={rx}
        y={ry}
        height={height}
        width={width}
      />
    </>
  );
};

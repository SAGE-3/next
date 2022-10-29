/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';

import { DraggableEvent } from 'react-draggable';
import { DraggableData, Rnd } from 'react-rnd';

import { useAppStore, useUIStore } from '@sage3/frontend';

import { Background } from './Background/Background';
import { Apps } from './Background/Apps';
import { Cursors } from './Background/Cursors';
import { Viewports } from './Background/Viewports';
import { Whiteboard } from './Background/Whiteboard/Whiteboard';

type BackgroundLayerProps = {
  boardId: string;
  roomId: string;
};

export function BackgroundLayer(props: BackgroundLayerProps) {
  // Apps Store
  const apps = useAppStore((state) => state.apps);
  const appsFetched = useAppStore((state) => state.fetched);

  // UI store
  const scale = useUIStore((state) => state.scale);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const setBoardDragging = useUIStore((state) => state.setBoardDragging);
  const fitApps = useUIStore((state) => state.fitApps);
  const boardLocked = useUIStore((state) => state.boardLocked);

  // Local State
  const [boardDrag, setBoardDrag] = useState(false); // Used to differentiate between board drag and app deselect

  // Position board when entering board
  useEffect(() => {
    if (appsFetched) {
      if (apps.length > 0) {
        fitApps(apps);
      } else {
        setBoardPosition({ x: -boardWidth / 2, y: -boardHeight / 2 });
        setScale(1);
      }
    }
  }, [appsFetched]);

  // Drag start of the board
  function handleDragBoardStart() {
    setBoardDragging(true);
  }

  // Handle Dragging
  function handleDragging() {
    if (!boardDrag) {
      setBoardDrag(true);
    }
  }

  // On a drag stop of the board. Set the board position locally.
  function handleDragBoardStop(event: DraggableEvent, data: DraggableData) {
    const x = data.x;
    const y = data.y;
    setBoardPosition({ x, y });
    setBoardDragging(false);
    // If this was just a click, then deselect the app.
    // If it was a drag, then don't deselect the app.
    if (!boardDrag) {
      setSelectedApp('');
    }
    setBoardDrag(false);
  }

  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      {/* Board. Uses lib react-rnd for drag events.
       * Draggable Background below is the actual target for drag events.*/}
      <Rnd
        // Remember board position and size
        default={{
          x: boardPosition.x,
          y: boardPosition.y,
          width: boardWidth,
          height: boardHeight,
        }}
        scale={scale}
        position={{ x: boardPosition.x, y: boardPosition.y }}
        onDragStart={handleDragBoardStart}
        onDrag={handleDragging}
        onDragStop={handleDragBoardStop}
        enableResizing={false}
        dragHandleClassName={'board-handle'}
        disableDragging={boardLocked}
      >
        {/*Whiteboard */}
        <Whiteboard boardId={props.boardId} />
        {/* The board's apps */}
        <Apps />
        {/* User Cursors */}
        <Cursors boardId={props.boardId} />
        {/* User Viewports */}
        <Viewports boardId={props.boardId} />

        {/* Draggable Background */}
        <Background boardId={props.boardId} roomId={props.roomId} />
      </Rnd>
    </div>
  );
}

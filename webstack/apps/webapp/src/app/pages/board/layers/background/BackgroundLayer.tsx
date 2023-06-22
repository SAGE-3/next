/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef } from 'react';

import { DraggableEvent } from 'react-draggable';
import { DraggableData, Rnd } from 'react-rnd';

import { useAppStore, useUIStore, useUser } from '@sage3/frontend';

import { Background, Apps, Cursors, Viewports, Whiteboard, UserPresenceUpdate, Lasso } from './components';
import { SAGE3Ability } from '@sage3/shared';

type BackgroundLayerProps = {
  boardId: string;
  roomId: string;
};

export function BackgroundLayer(props: BackgroundLayerProps) {
  // Abilities
  const { user } = useUser();
  const canLasso = SAGE3Ability.can(user?.data.userRole, 'lasso', 'app');

  // Apps Store
  const apps = useAppStore((state) => state.apps);
  const appsFetched = useAppStore((state) => state.fetched);
  // UI store
  const scale = useUIStore((state) => state.scale);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);
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
    if (selectedApp) {
      setSelectedApp('');
    }
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
      clearSelectedApps();
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
        {/*Lasso */}
        {canLasso && <Lasso boardId={props.boardId} />}
        {/* The board's apps */}
        <Apps />
        {/* User Cursors */}
        <Cursors boardId={props.boardId} />
        {/* User Viewports */}
        <Viewports boardId={props.boardId} />
        {/* This user updating prensence */}
        <UserPresenceUpdate />

        {/* Draggable Background */}
        <Background boardId={props.boardId} roomId={props.roomId} />
      </Rnd>
    </div>
  );
}

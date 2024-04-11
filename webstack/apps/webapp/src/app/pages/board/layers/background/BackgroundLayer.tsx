/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';
import { Box } from '@chakra-ui/react';

import { DraggableEvent } from 'react-draggable';
import { DraggableData, Rnd } from 'react-rnd';

import { useUIStore, useAbility } from '@sage3/frontend';

import { Background, Apps, Whiteboard, Lasso, PresenceComponent } from './components';

type BackgroundLayerProps = {
  boardId: string;
  roomId: string;
};

export function BackgroundLayer(props: BackgroundLayerProps) {
  // Abilities
  const canLasso = useAbility('lasso', 'apps');

  // UI store
  const scale = useUIStore((state) => state.scale);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const selectedApp = useUIStore((state) => state.selectedAppId);
  const clearSelectedApps = useUIStore((state) => state.clearSelectedApps);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const setBoardDragging = useUIStore((state) => state.setBoardDragging);
  const boardLocked = useUIStore((state) => state.boardLocked);
  const lassoMode = useUIStore((state) => state.lassoMode);

  // Local State
  const [boardDrag, setBoardDrag] = useState(false); // Used to differentiate between board drag and app deselect

  // Drag start of the board
  function handleDragBoardStart() {
    // setBoardDragging(true);
    if (selectedApp) {
      setSelectedApp('');
    }
  }

  // Handle Dragging
  function handleDragging() {
    if (!boardDrag) {
      setBoardDrag(true);
      // on the first move, set the board to dragging
      setBoardDragging(true);
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
    <Box transform={`scale(${scale})`} transformOrigin={'top left'}>
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
        {/* The board's apps */}
        <Apps />
        {/*Whiteboard */}
        <Whiteboard boardId={props.boardId} />
        {/*Lasso */}
        {canLasso && lassoMode && <Lasso boardId={props.boardId} />}
        {/* Presence of the users */}
        <PresenceComponent boardId={props.boardId} />

        {/* Draggable Background */}
        <Background boardId={props.boardId} roomId={props.roomId} />
      </Rnd>
    </Box>
  );
}

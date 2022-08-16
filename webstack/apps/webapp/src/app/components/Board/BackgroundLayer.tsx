/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Tag } from '@chakra-ui/react';
import { Applications, AppError } from '@sage3/applications/apps';
import { useAppStore, usePresence, usePresenceStore, useUIStore, useUser } from '@sage3/frontend';
import { useRef } from 'react';
import { DraggableEvent } from 'react-draggable';
import { ErrorBoundary } from 'react-error-boundary';
import { GiArrowCursor } from 'react-icons/gi';
import { DraggableData, Rnd } from 'react-rnd';
import { throttle } from 'throttle-debounce';
import { Background } from './Background/Background';

type BackgroundLayerProps = {
  boardId: string;
  roomId: string;
};

export function BackgroundLayer(props: BackgroundLayerProps) {
  // User
  const { user } = useUser();

  // Apps Store
  const apps = useAppStore((state) => state.apps);

  // UI store
  const scale = useUIStore((state) => state.scale);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);

  // Presence Information
  const { update: updatePresence } = usePresence();
  const presences = usePresenceStore((state) => state.presences);

  // On a drag stop of the board. Set the board position locally.
  function handleDragBoardStop(event: DraggableEvent, data: DraggableData) {
    setBoardPosition({ x: -data.x, y: -data.y });
  }

  // Update the cursor every half second
  // TODO: we skip events when the cursor is over the applications
  const throttleCursor = throttle(500, (e: React.MouseEvent<HTMLDivElement>) => {
    updatePresence({ cursor: { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, z: 0 } });
  });

  // Keep a copy of the function
  const throttleCursorFunc = useRef(throttleCursor);
  const cursorFunc = (e: React.MouseEvent<HTMLDivElement>) => {
    const boardElt = document.getElementById('board');
    // Check if event is on the board
    if (updatePresence && e.target === boardElt) {
      // Send the throttled version to the server
      throttleCursorFunc.current(e);
    }
  };

  return (
    <div style={{ transform: `scale(${scale})` }} onDoubleClick={() => setSelectedApp('')}>
      {/* Board. Uses lib react-rnd for drag events.
       * Draggable Background below is the actual target for drag events.*/}
      {/*Cursors */}

      <Rnd
        default={{
          x: 0,
          y: 0,
          width: 5000,
          height: 2500,
        }}
        onDragStop={handleDragBoardStop}
        enableResizing={false}
        dragHandleClassName={'board-handle'}
        scale={scale}
        id="monkey"
        onMouseMove={cursorFunc}
      >
        {/* Apps - SORT is to zIndex order them */}
        {apps
          .sort((a, b) => a._updatedAt - b._updatedAt)
          .map((app) => {
            const Component = Applications[app.data.type].AppComponent;
            return (
              // Wrap the components in an errorboundary to protect the board from individual app errors
              <ErrorBoundary
                key={app._id}
                fallbackRender={({ error, resetErrorBoundary }) => (
                  <AppError error={error} resetErrorBoundary={resetErrorBoundary} app={app} />
                )}
              >
                <Component key={app._id} {...app}></Component>
              </ErrorBoundary>
            );
          })}

        {/* Draw the cursors: filter by board and not myself */}
        {presences
          .filter((el) => el.data.boardId === props.boardId)
          .filter((el) => el.data.userId !== user?._id)
          .map((presence) => {
            return (
              <div
                key={presence.data.userId}
                style={{
                  position: 'absolute',
                  left: presence.data.cursor.x + 'px',
                  top: presence.data.cursor.y + 'px',
                  transition: 'all 0.5s ease-in-out',
                  pointerEvents: 'none',
                  display: 'flex',
                }}
              >
                <GiArrowCursor color="red"></GiArrowCursor>
                <Tag variant="solid" borderRadius="md" mt="3" mb="0" ml="-1" mr="0" p="1" color="white">
                  {/* using the ID before we can get the name */}
                  {presence.data.userId.split('-')[0]}
                </Tag>
              </div>
            );
          })}

        {/* Draggable Background */}
        <Background boardId={props.boardId} roomId={props.roomId}></Background>
      </Rnd>
    </div>
  );
}

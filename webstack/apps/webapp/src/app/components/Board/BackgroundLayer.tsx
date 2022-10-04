/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useCallback, useEffect, useState } from 'react';
import { Tag } from '@chakra-ui/react';
import { motion, useAnimation } from "framer-motion"

import { DraggableEvent } from 'react-draggable';
import { ErrorBoundary } from 'react-error-boundary';
import { GiArrowCursor } from 'react-icons/gi';
import { DraggableData, Rnd } from 'react-rnd';
import { throttle } from 'throttle-debounce';

import { useAppStore, usePresence, usePresenceStore, useUIStore, useUser, useUsersStore } from '@sage3/frontend';
import { Applications, AppError } from '@sage3/applications/apps';
import { sageColorByName } from '@sage3/shared';

import { Background } from './Background/Background';
import { AppWindow } from '@sage3/applications/apps';

type BackgroundLayerProps = {
  boardId: string;
  roomId: string;
};

export function BackgroundLayer(props: BackgroundLayerProps) {
  // User
  const { user } = useUser();

  // Apps Store
  const apps = useAppStore((state) => state.apps);
  const appsFetched = useAppStore((state) => state.fetched);

  // UI store
  const scale = useUIStore((state) => state.scale);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const resetZIndex = useUIStore((state) => state.resetZIndex);
  const boardDragging = useUIStore((state) => state.boardDragging);
  const setBoardDragging = useUIStore((state) => state.setBoardDragging);
  const fitApps = useUIStore((state) => state.fitApps);
  const boardLocked = useUIStore((state) => state.boardLocked);

  // Presence Information
  const { update: updatePresence } = usePresence();
  const presences = usePresenceStore((state) => state.presences);
  const users = useUsersStore((state) => state.users);

  // Position board when entering board
  useEffect(() => {
    if (appsFetched) {
      fitApps(apps);
    }
  }, [appsFetched]);
  // Local State
  const [boardDrag, setBoardDrag] = useState(false); // Used to differentiate between board drag and app deselect

  // Drag start fo the board
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

  // Reset the global zIndex when no apps
  useEffect(() => {
    if (apps.length === 0) resetZIndex();
  }, [apps]);

  // Update the cursor every half second
  const throttleCursor = throttle(500, (e: MouseEvent) => {
    if (boardDragging) return;
    const winX = e.clientX;
    const winY = e.clientY;
    const bx = boardPosition.x;
    const by = boardPosition.y;
    const s = scale;
    const x = winX / s - bx;
    const y = winY / s - by;
    const z = 0;
    updatePresence({ cursor: { x, y, z } });
  });

  // Keep a copy of the function
  const throttleCursorFunc = useCallback(throttleCursor, [boardPosition.x, boardPosition.y, scale, boardDragging]);
  const cursorFunc = (e: MouseEvent) => {
    // Check if event is on the board
    if (updatePresence) {
      // Send the throttled version to the server
      throttleCursorFunc(e);
    }
  };

  // Attach the mouse move event to the window
  useEffect(() => {
    const mouseMove = (e: MouseEvent) => cursorFunc(e);
    window.addEventListener('mousemove', mouseMove);
    return () => window.removeEventListener('mousemove', mouseMove);
  }, [boardPosition.x, boardPosition.y, scale, boardDragging]);

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
        {/* Apps */}
        {apps.map((app) => {
          if (app.data.type in Applications) {
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
          } else {
            // App not found: happens if unkonw app in sagebase
            return (<AppWindow key={app._id} app={app}>
              <div>App not found</div>
            </AppWindow>);
          }
        })}

        {/* Draw the cursors: filter by board and not myself */}
        {presences
          .filter((el) => el.data.boardId === props.boardId)
          .filter((el) => el.data.userId !== user?._id)
          .map((presence) => {
            return (
              <UserCursor
                key={presence.data.userId}
                color={users.find((el) => el._id === presence.data.userId)?.data.color || 'red'}
                position={presence.data.cursor}
                name={users.find((el) => el._id === presence.data.userId)?.data.name || '-'}
                scale={scale}
              />
            );
          })}

        {/* Draggable Background */}
        <Background boardId={props.boardId} roomId={props.roomId}></Background>
      </Rnd>
    </div>
  );
}

/**
 * User Curor Props
 */
interface UserCursorProps {
  name: string;
  color: string;
  position: { x: number, y: number, z: number };
  scale: number;
}

/**
 * Show a user pointer
 * @param props UserCursorProps
 * @returns
 */
function UserCursor(props: UserCursorProps) {
  // Create an animation object to control the opacity of pointer
  // Pointer fades after inactivity
  const controls = useAnimation();

  // Reset animation if pointer moves
  useEffect(() => {
    // Stop previous animation
    controls.stop();
    // Set initial opacity
    controls.set({ opacity: 0.8 });
    // Start animation
    controls.start({
      // final opacity
      opacity: 0.0,
      transition: {
        ease: 'easeIn',
        // duration in sec.
        duration: 10,
      },
    });
  }, [props.position.x, props.position.y, props.position.z]);

  return (<motion.div
    // pass the animation controller
    animate={controls}
    style={{
      position: 'absolute',
      left: props.position.x - 4 + 'px',
      top: props.position.y - 3 + 'px',
      transition: 'left 0.5s ease-in-out, top 0.5s ease-in-out',
      pointerEvents: 'none',
      display: 'flex',
      zIndex: 100000,
      transform: `scale(${1 / props.scale})`,
    }}
  >
    <GiArrowCursor color={sageColorByName(props.color)}></GiArrowCursor>
    <Tag variant="solid" borderRadius="md" mt="3" mb="0" ml="-1" mr="0" p="1" color="white">
      {props.name}
    </Tag>
  </motion.div>
  );
}
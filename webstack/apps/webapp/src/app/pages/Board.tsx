/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  useDisclosure,
  Modal,
  ModalOverlay,
  Tag,
} from '@chakra-ui/react';

import { Applications, AppError } from '@sage3/applications/apps';
import { usePresence, usePresenceStore } from '@sage3/frontend';

import { useAppStore, useBoardStore, useUser, useUIStore, ContextMenu} from '@sage3/frontend';


import { DraggableData, Rnd } from 'react-rnd';
import { throttle } from 'throttle-debounce';
import { DraggableEvent } from 'react-draggable';

import { GiArrowCursor } from 'react-icons/gi';

// Library to help create error boundaries around dynamic components like SAGEApplications
import { ErrorBoundary } from 'react-error-boundary';
import { BoardHeader } from '../components/Board/BoardHeader';
import { BoardFooter } from '../components/Board/BoardFooter';
import { ClearBoardModal } from '../components/Board/ClearBoardModal';
import { Twilio } from '../components/Board/Twilio';
import { BoardContextMenu } from '../components/Board/BoardContextMenu';
import { Background } from '../components/Board/Background';

type LocationParams = {
  boardId: string;
  roomId: string;
};

/**
 * The board page which displays the board and its apps.
 */
export function BoardPage() {

  // Navigation and routing
  const location = useLocation();
  const locationState = location.state as LocationParams;

  // Board and App Store stuff
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);
  const subBoard = useAppStore((state) => state.subToBoard);
  const unsubBoard = useAppStore((state) => state.unsubToBoard);
  const boards = useBoardStore((state) => state.boards);
  const board = boards.find((el) => el._id === locationState.boardId);

  // UI store
  const scale = useUIStore((state) => state.scale);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);

  // User information
  const { user } = useUser();

  // Presence Information
  const { update: updatePresence } = usePresence();
  const presences = usePresenceStore((state) => state.presences);

  // Clear the board modal
  const { isOpen: clearModalIsOpen, onOpen: clearModalOnOpen, onClose: clearModalOnClose } = useDisclosure();

  // Handle joining and leave a board
  useEffect(() => {
    // Subscribe to the board that was selected
    subBoard(locationState.boardId);
    // Update the user's presence information
    updatePresence({ boardId: locationState.boardId, roomId: locationState.roomId });

    // Uncmounting of the board page. user must have redirected back to the homepage. Unsubscribe from the board.
    return () => {
      // Unsube from board updates
      unsubBoard();
      // Update the user's presence information
      updatePresence({ boardId: '', roomId: '' });

    };
  }, []);

  // On a drag stop of the board. Set the board position locally.
  function handleDragBoardStop(event: DraggableEvent, data: DraggableData) {
    setBoardPosition({ x: -data.x, y: -data.y });
  }

  // Update the cursor every half second
  // TODO: They don't work over apps yet.
  const throttleCursor = throttle(500, (e: React.MouseEvent<HTMLDivElement>) => {
    if (updatePresence) updatePresence({ cursor: { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, z: 0 } });
  });
  // Keep a copy of the function
  const throttleCursorFunc = useRef(throttleCursor);

  return (
    <>
      <div style={{ transform: `scale(${scale})` }} onDoubleClick={() => setSelectedApp('')}>
        {/* Board. Uses lib react-rnd for drag events.
         * Draggable Background below is the actual target for drag events.*/}
        {/*Cursors */}

        <Rnd
          default={{
            x: 0,
            y: 0,
            width: 5000,
            height: 5000,
          }}
          onDragStop={handleDragBoardStop}
          enableResizing={false}
          dragHandleClassName={'board-handle'}
          scale={scale}
          id="monkey"
          onMouseMove={throttleCursorFunc.current}

        >
          {/* Apps - SORT is to zIndex order them */}
          {apps
            .sort((a, b) => a._updatedAt - b._updatedAt)
            .map((app) => {
              const Component = Applications[app.data.type].AppComponent;
              return (
                // Wrap the components in an errorboundary to protect the board from individual app errors
                <ErrorBoundary key={app._id}
                  fallbackRender={({ error, resetErrorBoundary }) => <AppError error={error} resetErrorBoundary={resetErrorBoundary} app={app} />}
                >
                  <Component key={app._id} {...app}></Component>
                </ErrorBoundary>)
            })}

          {/* Draw the cursors: filter by board and not myself */}
          {presences
            .filter((el) => el.data.boardId === locationState.boardId)
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
          <Background
            boardId={locationState.boardId}
            roomId={locationState.roomId}
          ></Background>
        </Rnd>
      </div>

      {/* Context-menu for the board */}
      <ContextMenu divId="board">
        <BoardContextMenu
          boardId={locationState.boardId}
          roomId={locationState.roomId}
          clearBoard={clearModalOnOpen}
        ></BoardContextMenu>
      </ContextMenu>

      {/* Top Bar */}
      <BoardHeader
        boardName={(board?.data.name) ? board.data.name : ''}
        boardId={locationState.boardId}
      />

      {/* Bottom Bar */}
      <BoardFooter
        boardId={locationState.boardId}
        roomId={locationState.roomId}
      ></BoardFooter>

      {/*Twilio*/}
      <Twilio roomName={locationState.boardId} />

      {/* Clear the board modal */}
      <Modal isCentered isOpen={clearModalIsOpen} onClose={clearModalOnClose}>
        <ModalOverlay />
        <ClearBoardModal
          onClick={() => {
            apps.forEach((a) => deleteApp(a._id));
            clearModalOnClose();
          }}
          onClose={clearModalOnClose}
        ></ClearBoardModal>
      </Modal>
    </>
  );
}

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { usePresence, useAppStore } from '@sage3/frontend';

// Board Layers
import { WhiteboardLayer, BackgroundLayer, UILayer } from '../components/Board';

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
  const subBoard = useAppStore((state) => state.subToBoard);
  const unsubBoard = useAppStore((state) => state.unsubToBoard);

  // Presence Information
  const { update: updatePresence } = usePresence();

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

  return (
    <>
      {/* The apps live here */}
      <BackgroundLayer boardId={locationState.boardId} roomId={locationState.roomId}></BackgroundLayer>

      {/* TODO White Board Layer for marking onto board */}
      <WhiteboardLayer boardId={locationState.boardId} roomId={locationState.roomId}></WhiteboardLayer>

      {/* Upper layer for local UI stuff */}
      <UILayer boardId={locationState.boardId} roomId={locationState.roomId}></UILayer>
    </>
  );
}

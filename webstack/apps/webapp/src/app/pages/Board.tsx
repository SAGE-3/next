/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { usePresence, useAppStore, useRouteNav, useBoardStore, useRoomStore, usePresenceStore, useUsersStore } from '@sage3/frontend';

// Board Layers
import { WhiteboardLayer, BackgroundLayer, UILayer } from '../components/Board';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { Clock } from '../components/Board/UI/Clock';

/**
 * The board page which displays the board and its apps.
 */
export function BoardPage() {
  // Navigation and routing
  const { roomId, boardId } = useParams();
  const { toHome } = useRouteNav();

  if (!roomId || !boardId) {
    toHome(roomId);
    return null;
  }

  // Board and App Store stuff
  const subApps = useAppStore((state) => state.subToBoard);
  const unsubBoard = useAppStore((state) => state.unsubToBoard);
  const subBoards = useBoardStore((state) => state.subscribeByRoomId);
  const subRooms = useRoomStore((state) => state.subscribeToAllRooms);

  // Presence Information
  const { update: updatePresence } = usePresence();
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);
  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);

  const logoUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // Handle joining and leave a board
  useEffect(() => {
    // This is if someone is joining a board by a link
    subRooms();
    // Sub to boards belonging to this room
    subBoards(roomId);
    // Subscribe to the app on the board that was selected
    subApps(boardId);
    // Sub to users and presence
    subscribeToPresence();
    subscribeToUsers();
    // Update the user's presence information
    updatePresence({ boardId: boardId, roomId: roomId });

    // Unmounting of the board page. user must have redirected back to the homepage. Unsubscribe from the board.
    return () => {
      // Unsub from board updates
      unsubBoard();
      // Update the user's presence information
      updatePresence({ boardId: '', roomId: '' });
    };
  }, []);

  return (
    <>
      {/* The apps live here */}
      <BackgroundLayer boardId={boardId} roomId={roomId}></BackgroundLayer>

      {/* The Corner SAGE3 Image */}
      <Box position="absolute" bottom="2" right="2" opacity={0.7}>
        <img src={logoUrl} width="75px" alt="sage3 collaborate smarter" />
      </Box>

      <Clock style={{ position: 'absolute', right: 0, top: 0, marginRight: '8px' }} opacity={0.7} />

      {/* White Board Layer for marking onto board */}
      <WhiteboardLayer boardId={boardId} roomId={roomId}></WhiteboardLayer>

      {/* Upper layer for local UI stuff */}
      <UILayer boardId={boardId} roomId={roomId}></UILayer>
    </>
  );
}

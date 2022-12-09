/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, useColorModeValue, Text } from '@chakra-ui/react';

import {
  useAppStore,
  useRouteNav,
  useBoardStore,
  useRoomStore,
  usePresenceStore,
  useUsersStore,
  PasteHandler,
  MainButton,
  useUIStore,
  useData,
  serverConfiguration,
  useUser,
} from '@sage3/frontend';

// Board Layers
import { BackgroundLayer, UILayer } from '../components/Board';
import { Clock } from '../components/Board/UI/Clock';

/**
 * The board page which displays the board and its apps.
 */
export function BoardPage() {
  // Navigation and routing
  const { roomId, boardId } = useParams();
  const { toHome } = useRouteNav();
  const config = useData('/api/configuration') as serverConfiguration;
  const textColor = useColorModeValue('gray.800', 'gray.100');

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
  const { user } = useUser();
  const updatePresence = usePresenceStore((state) => state.update);
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);
  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);

  // UI Store
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);

  const logoUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  function handleDragOver(event: DragEvent) {
    const elt = event.target as HTMLElement;
    if (elt.id !== 'board') {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
      event.preventDefault();
    }
  }
  function handleDrop(event: DragEvent) {
    event.preventDefault();
  }

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
    if (user) updatePresence(user._id, { boardId: boardId, roomId: roomId });

    // Set Selected app to empty
    setSelectedApp('');

    // Prevent drag/drop when not on the board
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    // Unmounting of the board page. user must have redirected back to the homepage. Unsubscribe from the board.
    return () => {
      // Unsub from board updates
      unsubBoard();
      // Update the user's presence information
      if (user) updatePresence(user._id, { boardId: '', roomId: '' });
      // Set Selected app to empty
      setSelectedApp('');
      // Remove event listeners
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  return (
    <>
      {/* The apps live here */}
      <BackgroundLayer boardId={boardId} roomId={roomId}></BackgroundLayer>

      {/* The Corner SAGE3 Image */}
      <Box position="absolute" bottom="2" right="2" opacity={0.7}>
        <img src={logoUrl} width="75px" alt="sage3 collaborate smarter" draggable={false} />
      </Box>

      <Clock style={{ position: 'absolute', right: 0, top: 0, marginRight: '8px' }} opacity={0.7} />

      {/* Upper layer for local UI stuff */}
      <UILayer boardId={boardId} roomId={roomId}></UILayer>

      {/* Paste data on the board */}
      <PasteHandler boardId={boardId} roomId={roomId} />

      <Box position="absolute" left="2" bottom="2" zIndex={101}>
        <MainButton buttonStyle="solid" backToRoom={() => toHome(roomId)} boardInfo={{ boardId, roomId }} />
      </Box>

      {/* ServerName */}
      <Text fontSize={'xl'} opacity={0.7} position="absolute" left="2" color={textColor} userSelect="none" whiteSpace="nowrap">
        {config?.serverName}
      </Text>
    </>
  );
}

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useColorModeValue } from '@chakra-ui/react';

import {
  useAppStore,
  useRouteNav,
  useBoardStore,
  useRoomStore,
  usePresenceStore,
  useUsersStore,
  PasteHandler,
  useUIStore,
  useUser,
  usePluginListener,
  usePluginStore,
} from '@sage3/frontend';

// Board Layers
import { BackgroundLayer, UILayer } from './layers';

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

  const subPlugins = usePluginStore((state) => state.subscribeToPlugins);

  // Presence Information
  const { user } = useUser();
  const updatePresence = usePresenceStore((state) => state.update);
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);
  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);

  // UI Store
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);

  // Plugin Listener
  // Listens to updates from plugin apps and sends them to the AppStore
  usePluginListener();

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

  function saveBoardIdToLocalStorage() {
    if (!boardId) return;
    localStorage.setItem('boardId', boardId);
  }

  // Handle joining and leave a board
  useEffect(() => {
    // Update the document title
    document.title = 'SAGE3 - Board';

    // This is if someone is joining a board by a link
    subRooms();
    // Sub to boards belonging to this room
    subBoards(roomId);
    // Subscribe to the app on the board that was selected
    subApps(boardId);
    // Sub to users and presence
    subscribeToPresence();
    subscribeToUsers();

    // plugins
    subPlugins();
    // Update the user's presence information
    if (user) updatePresence(user._id, { boardId: boardId, roomId: roomId, following: '' });

    // Set Selected app to empty
    setSelectedApp('');

    // Prevent drag/drop when not on the board
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    // Handle a refresh to keep the user on the board
    window.addEventListener('beforeunload', saveBoardIdToLocalStorage);

    // Unmounting of the board page. user must have redirected back to the homepage. Unsubscribe from the board.
    return () => {
      // Unsub from board updates
      unsubBoard(user ? user._id : '');
      // Update the user's presence information
      if (user) updatePresence(user._id, { boardId: '', roomId: '', following: '' });
      // Set Selected app to empty
      setSelectedApp('');
      // Remove event listeners
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
      window.removeEventListener('beforeunload', saveBoardIdToLocalStorage);
    };
  }, [roomId, boardId]);

  return (
    <>
      {/* The apps live here */}
      <BackgroundLayer boardId={boardId} roomId={roomId}></BackgroundLayer>

      {/* Upper layer for local UI stuff */}
      <UILayer boardId={boardId} roomId={roomId}></UILayer>

      {/* Paste data on the board */}
      <PasteHandler boardId={boardId} roomId={roomId} />
    </>
  );
}

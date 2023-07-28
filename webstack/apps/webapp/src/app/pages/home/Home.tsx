/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, useColorModeValue, Text, Image, Progress } from '@chakra-ui/react';

import {
  JoinBoardCheck,
  RoomList,
  useBoardStore,
  usePresenceStore,
  useRoomStore,
  useUsersStore,
  MainButton,
  useUser,
  Clock,
  usePluginStore,
  useConfigStore,
} from '@sage3/frontend';
import { Board, Room } from '@sage3/shared/types';

import { useParams } from 'react-router-dom';

export function HomePage() {
  // URL Params
  const { roomId } = useParams();

  // Configuration information
  const config = useConfigStore((state) => state.config);

  // Room Store
  const [selectedRoomId] = useState<string | undefined>(roomId);
  const rooms = useRoomStore((state) => state.rooms);
  const subToRooms = useRoomStore((state) => state.subscribeToAllRooms);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const roomsFetched = useRoomStore((state) => state.fetched);

  // Board Store
  const boards = useBoardStore((state) => state.boards);
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(undefined);

  // Plugins
  const subPlugins = usePluginStore((state) => state.subscribeToPlugins);

  // Users and presence
  const { user } = useUser();
  const updatePresence = usePresenceStore((state) => state.update);
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);
  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);

  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // Subscribe to user updates
  useEffect(() => {
    // Update the document title
    document.title = 'SAGE3 - Rooms and Boards';

    subscribeToPresence();
    subscribeToUsers();
    subToRooms();
    subPlugins();
  }, []);

  function handleRoomClick(room: Room | undefined) {
    if (room) {
      setSelectedRoom(room);
      setSelectedBoard(undefined);
      if (user) updatePresence(user._id, { roomId: room._id, boardId: '', following: '' });
    } else {
      setSelectedRoom(undefined);
      setSelectedBoard(undefined);
      if (user) updatePresence(user._id, { roomId: '', boardId: '', following: '' });
    }
  }

  function handleBoardClick(board: Board) {
    setSelectedBoard(board);
  }

  useEffect(() => {
    const room = rooms.find((r) => r._id === selectedRoom?._id);
    if (!room) {
      setSelectedRoom(undefined);
      setSelectedBoard(undefined);
    } else {
      setSelectedRoom(room);
    }
    if (!boards.find((board) => board._id === selectedBoard?._id)) {
      setSelectedBoard(undefined);
    }
  }, [JSON.stringify(rooms), JSON.stringify(boards)]);

  // To handle the case where the user is redirected to the home page from a board
  useEffect(() => {
    function goToMainRoom() {
      // Go to Main RoomS hould be the oldest room on the server.
      const room = rooms.reduce((prev, curr) => (prev._createdAt < curr._createdAt ? prev : curr));
      handleRoomClick(room);
    }
    if (roomsFetched) {
      if (!selectedRoomId) {
        goToMainRoom();
      } else {
        // Go to room with id. Does room exist, if not go to main room
        const room = rooms.find((room) => room._id === selectedRoomId);
        room ? handleRoomClick(room) : goToMainRoom();
      }
    }
  }, [roomsFetched]);

  return (
    // Main Container
    <Box display="flex" flexDir={'column'} width="100%" height="100%" alignItems="center" justifyContent="space-between">
      {/* Check if the user wanted to join a board through a URL */}
      <JoinBoardCheck />
      {/* Top Bar */}
      <Box display="flex" flexDirection="row" justifyContent="space-between" minHeight={45} width="100vw" px="2">
        <Box flex="1 1 0px">
          <Text
            fontSize="xl"
            flex="1 1 0px"
            textOverflow={'ellipsis'}
            overflow={'hidden'}
            justifyContent="left"
            display="flex"
            width="100%"
            userSelect="none"
            whiteSpace={'nowrap'}
          >
            {config?.serverName}
          </Text>
        </Box>
        <Box></Box>

        <Box flex="1 1 0px" justifyContent="right" display="flex" alignItems={'start'}>
          <Clock />
        </Box>
      </Box>

      {/* Middle Section */}

      <Box
        display="flex"
        flexDirection="row"
        flexGrow={1}
        justifyContent={'center'}
        minHeight={0}
        width="100%"
        maxWidth="1200px"
        minWidth="400px"
        px="4"
      >
        {roomsFetched ? (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent={'center'}
            alignItems="flex-start"
            height="100%"
            width="100%"
            maxWidth="1200"
          >
            <RoomList
              selectedRoom={selectedRoom}
              onRoomClick={handleRoomClick}
              rooms={rooms}
              boards={boards}
              onBackClick={() => handleRoomClick(undefined)}
              onBoardClick={handleBoardClick}
            ></RoomList>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" justifyContent={'center'} alignItems="center" height="100%" width="100%">
            <Progress isIndeterminate width="100%" borderRadius="md" />
          </Box>
        )}
      </Box>

      {/* Bottom Bar */}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent={'space-between'}
        width="100%"
        minHeight={'initial'}
        alignItems="center"
        py="2"
        px="2"
      >
        <MainButton buttonStyle="solid" config={config} />
        <Image src={imageUrl} height="30px" style={{ opacity: 0.7 }} alt="sag3" userSelect={'auto'} draggable={false} />
      </Box>
    </Box>
  );
}

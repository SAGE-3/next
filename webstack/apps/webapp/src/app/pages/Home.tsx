/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { MdSettings } from 'react-icons/md';
import { Box, useColorModeValue, Text, IconButton, useDisclosure } from '@chakra-ui/react';

import { EditRoomModal, useBoardStore, usePresence, usePresenceStore, useRoomStore, useUser, useUsersStore } from '@sage3/frontend';
import { Board, Room } from '@sage3/shared/types';

import { BoardList } from '../components/Home/BoardList';
import { HomeAvatar } from '../components/Home/HomeAvatar';
import { RoomList } from '../components/Home/RoomList';
import { useLocation } from 'react-router-dom';
import { Clock } from '../components/Board/UI/Clock';

export function HomePage() {
  // User
  const { user } = useUser();

  // Room Store
  const location = useLocation() as any;
  const [roomId] = useState<string | undefined>(location.state?.roomId);
  const rooms = useRoomStore((state) => state.rooms);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const roomOwner = selectedRoom?.data.ownerId === user?._id;
  const roomsFetched = useRoomStore((state) => state.fetched);

  // Board Store
  const boards = useBoardStore((state) => state.boards);
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(undefined);

  // Users and presence
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);
  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);
  const { update: updatePresence } = usePresence();

  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // Subscribe to user updates
  useEffect(() => {
    subscribeToPresence();
    subscribeToUsers();
  }, []);

  function handleRoomClick(room: Room) {
    setSelectedRoom(room);
    updatePresence({ roomId: room._id, boardId: '' });
    setSelectedBoard(undefined);
  }

  function handleBoardClick(board: Board) {
    setSelectedBoard(board);
  }

  useEffect(() => {
    if (!rooms.find((room) => room._id === selectedRoom?._id)) {
      setSelectedRoom(undefined);
      setSelectedBoard(undefined);
    }
    if (!boards.find((board) => board._id === selectedBoard?._id)) {
      setSelectedBoard(undefined);
    }
  }, [rooms, boards]);

  // To handle the case where the user is redirected to the home page from a board
  useEffect(() => {
    function goToMainRoom() {
      // Go to Main RoomS hould be the oldest room on the server.
      const room = rooms.reduce((prev, curr) => (prev._createdAt < curr._createdAt ? prev : curr));
      handleRoomClick(room);
    }
    if (roomsFetched) {
      if (!roomId) {
        goToMainRoom();
      } else {
        // Go to room with id. Does room exist, if not go to main room
        const room = rooms.find((room) => room._id === roomId);
        room ? handleRoomClick(room) : goToMainRoom();
      }
    }
  }, [roomsFetched]);

  return (
    <Box p="2" display="flex" flexDir={'column'} width="100%" alignItems="center">
      <Box display="flex" flexDirection="row">
        <Text fontSize="5xl">SERVER_NAME</Text>
      </Box>

      <Box display="flex" flexDirection="row" flexGrow={1} width="1200px" mb="5">
        <Box width="600px" height="80vh" display="flex" flexDirection="column" justifyContent="flex-start" mr="2">
          <Text fontSize={'4xl'} width="100%" justifyContent={'center'} textAlign="center">
            Rooms
          </Text>
          <RoomList selectedRoom={selectedRoom} onRoomClick={handleRoomClick}></RoomList>
        </Box>

        <Box width="600px" height="80vh" display="flex" flexDirection="column" justifyContent="flex-start" ml="2">
          <Text fontSize={'4xl'} width="100%" justifyContent={'center'} textAlign="center">
            Boards
          </Text>

          {selectedRoom ? (
            <BoardList onBoardClick={handleBoardClick} selectedRoom={selectedRoom} selectedBoard={selectedBoard}></BoardList>
          ) : null}
        </Box>
      </Box>

      <Box position="absolute" left="2" bottom="4" display="flex" alignItems="center">
        <HomeAvatar />
      </Box>

      {/* The Corner SAGE3 Image */}
      <Box position="absolute" bottom="2" right="2" opacity={0.7}>
        <img src={imageUrl} width="75px" alt="" />
      </Box>

      <Clock />
    </Box>
  );
}

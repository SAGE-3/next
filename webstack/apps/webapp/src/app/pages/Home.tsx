/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { MdSettings } from 'react-icons/md';
import { Box, useColorModeValue, Text, IconButton, useDisclosure, Image, Divider } from '@chakra-ui/react';

import { EditRoomModal, useBoardStore, usePresence, usePresenceStore, useRoomStore, useUser, useUsersStore } from '@sage3/frontend';
import { Board, Room } from '@sage3/shared/types';

import { BoardList } from '../components/Home/BoardList';
import { HomeAvatar } from '../components/Home/HomeAvatar';
import { RoomList } from '../components/Home/RoomList';
import { useLocation } from 'react-router-dom';
import { Clock } from '../components/Board/UI/Clock';
import { UserList } from '../components/Home/UserList';
import { ChatList } from '../components/Home/ChatList';
import { Rnd } from 'react-rnd';

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
    // Main Container
    <Box display="flex" flexDir={'column'} width="100%" height="100%" alignItems="center" justifyContent="space-between">
      {/* Top Bar */}
      <Box display="flex" flexDirection="row" justifyContent="space-between" minHeight={2} width="100%" px="2">
        <Box></Box>
        <Text fontSize="3xl">SERVER_NAME</Text>
        <Clock />
      </Box>

      {/* Middle Section */}
      <Box display="flex" flexDirection="row" flexGrow={1} width="100%" justifyContent={'space-between'} minHeight={0} px="2">
        {/* Left Side */}
        <Box display="flex" justifyContent="flex-start" flexGrow={1} overflow="hidden" mr="2">
          {/* Rooms List */}

          <Box display="flex" flexDirection="column" justifyContent={'flex-end'} flexGrow={1}>
            <Text fontSize={'3xl'} textAlign="center">
              Rooms
            </Text>
            <Box background="gray.700" m="4" mt="0" p="4" border="solid 3px" borderColor="blue.700" borderRadius="md">
              <RoomList selectedRoom={selectedRoom} onRoomClick={handleRoomClick}></RoomList>
            </Box>
          </Box>

          {/* Boards List */}
          <Box display="flex" flexDirection="column" justifyContent={'flex-end'} flexGrow={4}>
            <Text fontSize={'3xl'} textAlign="center">
              Boards
            </Text>
            <Box background="gray.700" m="4" mt="0" p="4" border="solid 3px" borderColor="blue.700" borderRadius="md">
              {selectedRoom ? (
                <BoardList onBoardClick={handleBoardClick} selectedRoom={selectedRoom} selectedBoard={selectedBoard}></BoardList>
              ) : null}
            </Box>
          </Box>
        </Box>

        {/* Right Side */}
        <Box display="flex" justifyContent="flex-start" flexGrow={1} ml="5">
          {/* Chats List */}
          <Box display="flex" flexDirection="column" flexGrow={4} mr="3" justifyContent={'flex-end'}>
            <Text fontSize={'3xl'} textAlign="center">
              Chat
            </Text>
            <ChatList />{' '}
          </Box>

          {/* Users List */}
          <Box display="flex" flexDirection="column" flexGrow={1} justifyContent={'flex-end'}>
            <Text fontSize={'3xl'} textAlign="center">
              Users
            </Text>
            <UserList
              onUserClick={() => {
                'hi';
              }}
              selectedUser={user}
            ></UserList>
          </Box>
        </Box>
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
        <HomeAvatar />
        <Box></Box>
        <Image src={imageUrl} height="30px" style={{ opacity: 0.7 }} alt="" />
      </Box>
    </Box>
  );
}

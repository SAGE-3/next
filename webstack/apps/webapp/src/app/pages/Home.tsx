/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { MdArrowBack, MdSettings } from 'react-icons/md';
import { Box, useColorModeValue, Text, IconButton, useDisclosure, Image, Divider, Button, Tooltip } from '@chakra-ui/react';

import {
  EditRoomModal,
  serverConfiguration,
  useBoardStore,
  useData,
  usePresence,
  usePresenceStore,
  useRoomStore,
  useUser,
  useUsersStore,
} from '@sage3/frontend';
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
  const subToRooms = useRoomStore((state) => state.subscribeToAllRooms);
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
  const config = useData('/api/configuration') as serverConfiguration;

  // Subscribe to user updates
  useEffect(() => {
    subscribeToPresence();
    subscribeToUsers();
    subToRooms();
  }, []);

  function handleRoomClick(room: Room | undefined) {
    if (room) {
      setSelectedRoom(room);
      setSelectedBoard(undefined);
      updatePresence({ roomId: room._id, boardId: '' });
    } else {
      setSelectedRoom(undefined);
      setSelectedBoard(undefined);
      updatePresence({ roomId: '', boardId: '' });
    }
  }

  function handleBoardClick(board: Board) {
    setSelectedBoard(board);
  }

  useEffect(() => {
    const room = rooms.find((r) => r._id === selectedRoom?._id);
    console.log('why?');
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
        <Box flex="1 1 0px"></Box>
        <Text fontSize="3xl" flex="1 1 0px" justifyContent="center" display="flex">
          {config?.serverName}
        </Text>
        <Box flex="1 1 0px" justifyContent="right" display="flex" alignItems={'start'}>
          <Clock />
        </Box>
      </Box>

      {/* Middle Section */}
      <Box
        display="flex"
        flexDirection="row"
        flexGrow={1}
        width="100%"
        justifyContent={'center'}
        minHeight={0}
        px="2"
        alignItems={'center'}
      >
        <Box display="flex" flexDirection="column" justifyContent={'center'} height="75vh" width="75vw">
          <Box height="75vh" width="75vw" style={{ perspective: '2400px' }}>
            <Box
              transition=" transform 1s ease-in-out"
              style={{ transformStyle: 'preserve-3d' }}
              transform={selectedRoom ? 'rotateY(-180deg)' : 'rotateY(0deg)'}
              position="relative"
              width="100%"
              height="100%"
            >
              <Box className="front" style={{ backfaceVisibility: 'hidden' }} position="absolute" width="100%" height="100%">
                <RoomList selectedRoom={selectedRoom} onRoomClick={handleRoomClick} rooms={rooms}></RoomList>
              </Box>

              <Box
                className="back"
                style={{ backfaceVisibility: 'hidden' }}
                transform="rotateY(-180deg)"
                position="absolute"
                width="100%"
                height="100%"
              >
                <BoardList
                  onBoardClick={handleBoardClick}
                  onBackClick={() => handleRoomClick(undefined)}
                  selectedRoom={selectedRoom}
                  selectedBoard={selectedBoard}
                  boards={boards}
                ></BoardList>
              </Box>
            </Box>
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

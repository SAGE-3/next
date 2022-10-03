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
import { BoardPreview } from '../components/Home/BoardPreview';
import { useLocation } from 'react-router-dom';

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

  // Edit room Modal disclosure
  const { isOpen: isOpenEdit, onOpen: onOpenEdit, onClose: onCloseEdit } = useDisclosure();

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
    <Box p="2">
      <Box display="flex" flexDirection="row" flexWrap="nowrap">
        {/* List of Rooms Sidebar */}
        <Box display="flex" flexGrow="0" flexDirection="column" flexWrap="nowrap" height="100vh" px="3">
          <RoomList selectedRoom={selectedRoom} onRoomClick={handleRoomClick}></RoomList>
        </Box>

        {/* Selected Room */}
        <Box mx="5">
          <Box display="flex" flexDirection="row" width="2000px">
            <Box display="flex" flexWrap="wrap" flexDirection="column" width="800px" height="100%">
              {selectedRoom ? (
                <>
                  <Box display="flex" justifyContent="center" alignItems="center">
                    <Text fontSize={'4xl'} mr="2">
                      {selectedRoom?.data.name}
                    </Text>
                    {roomOwner ? (
                      <IconButton
                        aria-label="Edit"
                        variant="ghost"
                        fontSize="3xl"
                        icon={<MdSettings />}
                        transform="translateY(2px)"
                        onClick={onOpenEdit}
                      />
                    ) : null}
                  </Box>

                  <EditRoomModal isOpen={isOpenEdit} onClose={onCloseEdit} onOpen={onOpenEdit} room={selectedRoom} />

                  <BoardList onBoardClick={handleBoardClick} selectedRoom={selectedRoom} selectedBoard={selectedBoard}></BoardList>
                </>
              ) : null}
            </Box>

            <Box width="1200px" height="100%" mx="8" display="flex" flexDir="column">
              {selectedBoard ? (
                <Box>
                  <Box justifyContent={'center'} alignContent="center" display="flex">
                    <Text fontSize="4xl">{selectedBoard?.data.name}</Text>
                  </Box>
                  <BoardPreview board={selectedBoard}></BoardPreview>
                </Box>
              ) : null}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box position="absolute" left="2" bottom="4" display="flex" alignItems="center">
        <HomeAvatar />
      </Box>

      {/* The Corner SAGE3 Image */}
      <Box position="absolute" bottom="2" right="2" opacity={0.7}>
        <img src={imageUrl} width="75px" alt="" />
      </Box>
    </Box>
  );
}

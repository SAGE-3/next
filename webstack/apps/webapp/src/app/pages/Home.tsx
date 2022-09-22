/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { MdSettings } from 'react-icons/md';
import { Box, useColorModeValue, Text, Icon, Divider, IconButton, useDisclosure } from '@chakra-ui/react';

import { SBDocument } from '@sage3/sagebase';
import { EditRoomModal, useBoardStore, usePresence, usePresenceStore, useRoomStore, useUser, useUsersStore } from '@sage3/frontend';
import { BoardSchema, RoomSchema } from '@sage3/shared/types';

import { BoardList } from '../components/Home/BoardList';
import { HomeAvatar } from '../components/Home/HomeAvatar';
import { RoomList } from '../components/Home/RoomList';
import { BoardPreview } from '../components/Home/BoardPreview';

export function HomePage() {
  // User
  const { user } = useUser();

  // Room Store
  const [selectedRoom, setSelectedRoom] = useState<SBDocument<RoomSchema> | null>(null);
  const rooms = useRoomStore((state) => state.rooms);
  const roomOwner = selectedRoom?.data.ownerId === user?._id;

  // Edit room Modal disclosure
  const { isOpen: isOpenEdit, onOpen: onOpenEdit, onClose: onCloseEdit } = useDisclosure();

  // Board Sotre
  const boards = useBoardStore((state) => state.boards);
  const [selectedBoard, setSelectedBoard] = useState<SBDocument<BoardSchema> | null>(null);

  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // Users anad presence
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);
  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);
  const { update: updatePresence } = usePresence();

  // Subscribe to user updates
  useEffect(() => {
    subscribeToPresence();
    subscribeToUsers();
  }, []);

  function handleRoomClick(room: SBDocument<RoomSchema>) {
    setSelectedRoom(room);
    updatePresence({ roomId: room._id, boardId: '' });
    setSelectedBoard(null);
  }

  function handleBoardClick(board: SBDocument<BoardSchema>) {
    setSelectedBoard(board);
  }

  useEffect(() => {
    console.log(rooms);
    if (!rooms.find((room) => room._id === selectedRoom?._id)) {
      setSelectedRoom(null);
      setSelectedBoard(null);
    }
    if (!boards.find((board) => board._id === selectedBoard?._id)) {
      setSelectedBoard(null);
    }
  }, [rooms, boards]);

  return (
    <Box p="2">
      <Box display="flex" flexDirection="row" flexWrap="nowrap">
        {/* List of Rooms Sidebar */}
        <Box display="flex" flexGrow="0" flexDirection="column" flexWrap="nowrap" height="100vh" px="3">
          <RoomList selectedRoom={selectedRoom} onRoomClick={handleRoomClick}></RoomList>
        </Box>

        {/* Selected Room */}
        <Box mx="5">
          <Box display="flex" flexDirection="row">
            <Box display="flex" flexWrap="wrap" flexDirection="column" width="700px" height="100%">
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

                  <BoardList onBoardClick={handleBoardClick} selectedRoom={selectedRoom}></BoardList>
                </>
              ) : null}
            </Box>

            {selectedBoard ? <BoardPreview board={selectedBoard}></BoardPreview> : null}
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

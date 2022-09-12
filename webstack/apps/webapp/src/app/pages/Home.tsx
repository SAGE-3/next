/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useColorModeValue, Text, Icon } from '@chakra-ui/react';
import { usePresence, usePresenceStore, useUsersStore } from '@sage3/frontend';
import { SBDocument } from '@sage3/sagebase';

import { Board, BoardSchema, RoomSchema } from '@sage3/shared/types';
import e from 'express';
import { useEffect, useState } from 'react';
import { MdSettings } from 'react-icons/md';
import { useNavigate } from 'react-router';

import { BoardList } from '../components/Home/BoardList';
import { HomeAvatar } from '../components/Home/HomeAvatar';
import { RoomList } from '../components/Home/RoomList';

export function HomePage() {
  const [selectedRoom, setSelectedRoom] = useState<SBDocument<RoomSchema> | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<SBDocument<BoardSchema> | null>(null);

  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  const subscribeToPresence = usePresenceStore((state) => state.subscribe);
  const { update: updatePresence } = usePresence();

  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);

  useEffect(() => {
    subscribeToPresence();
    subscribeToUsers();
  }, []);

  const navigate = useNavigate();

  function handleRoomClick(room: SBDocument<RoomSchema>) {
    setSelectedRoom(room);
    updatePresence({ roomId: room._id, boardId: '' });
    setSelectedBoard(null);
  }

  function handleBoardClick(board: SBDocument<BoardSchema>) {
    setSelectedBoard(board);
  }

  function handleEnterBoard(board: SBDocument<BoardSchema>) {
    setSelectedBoard(board);
    if (selectedRoom) {
      navigate('/board', { state: { roomId: board.data.roomId, boardId: board._id } });
    }
  }

  function enterBoard(board: Board) {
    navigate('/board', { state: { roomId: board.data.roomId, boardId: board._id } });
  }

  return (
    <Box p="2">
      <Box display="flex" flexDirection="row" flexWrap="nowrap">
        {/* List of Rooms Sidebar */}
        <Box display="flex" flexGrow="0" flexDirection="column" flexWrap="nowrap" height="100vh" px="3">
          <RoomList selectedRoom={selectedRoom} onRoomClick={handleRoomClick}></RoomList>
        </Box>

        {/* Selected Room */}
        <Box flexGrow="8" mx="5">
          <Box display="flex" flexDirection="row">
            <Box display="flex" flexWrap="wrap" flexDirection="column" width={[300, 300, 400, 500]}>
              <BoardList onBoardClick={handleBoardClick} onEnterClick={handleEnterBoard} selectedRoom={selectedRoom}></BoardList>
            </Box>

            <Box
              width="100%"
              height="100%"
              // background="gray.700"
              borderRadius="md"
              m="2"
              ml="8"
              p="4"
              display="flex"
              flexDirection="column"
            >
              {selectedRoom ? (
                <>
                  <Box display="flex" justifyContent="center">
                    <Text fontSize={'4xl'}>
                      {selectedRoom?.data.name} <Icon as={MdSettings} transform="translateY(6px)" />
                    </Text>
                  </Box>

                  <Box
                    display="flex"
                    justifyContent="center"
                    width="100%"
                    height="300px"
                    backgroundColor="gray.600"
                    borderRadius="md"
                    p="2"
                  >
                    <Box
                      width="100%"
                      height="100%"
                      backgroundColor="purple.600"
                      borderRadius="md"
                      display="flex"
                      justifyContent="center"
                      alignItems={'center'}
                      mx="2"
                    >
                      {' Info '}
                    </Box>
                    <Box
                      width="100%"
                      height="100%"
                      backgroundColor="yellow.600"
                      borderRadius="md"
                      display="flex"
                      justifyContent="center"
                      alignItems={'center'}
                      mx="2"
                    >
                      {'Chart  '}
                    </Box>
                    <Box
                      width="100%"
                      height="100%"
                      backgroundColor="blue.600"
                      borderRadius="md"
                      display="flex"
                      justifyContent="center"
                      alignItems={'center'}
                      mx="2"
                    >
                      {'Calendar '}
                    </Box>
                  </Box>
                </>
              ) : null}

              {selectedBoard ? (
                <>
                  <Box display="flex" justifyContent="center" mt="8">
                    <Text fontSize={'4xl'}>
                      {selectedBoard?.data.name} <Icon as={MdSettings} transform="translateY(6px)" />
                    </Text>
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="center"
                    width="100%"
                    height="300px"
                    backgroundColor="gray.600"
                    borderRadius="md"
                    p="2"
                  >
                    <Box
                      width="30%"
                      height="100%"
                      backgroundColor="red.600"
                      borderRadius="md"
                      display="flex"
                      justifyContent="center"
                      alignItems={'center'}
                      mx="2"
                    >
                      {'Chart'}
                    </Box>
                    <Box
                      width="70%"
                      height="100%"
                      backgroundColor="green.600"
                      borderRadius="md"
                      display="flex"
                      justifyContent="center"
                      alignItems={'center'}
                      mx="2"
                    >
                      {'Chat'}
                    </Box>
                  </Box>
                </>
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

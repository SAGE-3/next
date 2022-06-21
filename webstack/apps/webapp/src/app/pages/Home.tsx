/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, useColorModeValue } from '@chakra-ui/react';
import { SBDocument } from '@sage3/sagebase';

import { BoardSchema, RoomSchema } from '@sage3/shared/types';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { BoardList } from '../components/BoardList';
import { Header } from '../components/Header';
import { RoomList } from '../components/RoomList';

export function HomePage() {

  const [selectedRoom, setSelectedRoom] = useState<SBDocument<RoomSchema> | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<SBDocument<BoardSchema> | null>(null);

  const imageUrl = useColorModeValue("/assets/SAGE3LightMode.png", "/assets/SAGE3DarkMode.png");

  const navigate = useNavigate();

  function handleRoomClick(room: SBDocument<RoomSchema>) {
    setSelectedRoom(room);
    setSelectedBoard(null);
  }

  function handleBoardClick(board: SBDocument<BoardSchema>) {
    setSelectedBoard(board);
  }

  function handleEnterBoard(board: SBDocument<BoardSchema>) {
    setSelectedBoard(board);
    if (selectedRoom) {
      navigate('/board', { state: { roomId: selectedRoom._id, boardId: board._id } });
    }
  }

  return (
    <div>
      <Header title={(selectedRoom) ? selectedRoom.data.name : "Select a Room"}></Header>

      <Box display="flex" flexDirection="row" flexWrap="nowrap">

        {/* List of Rooms Sidebar */}
        <Box display='flex' flexGrow="0" flexDirection="column" flexWrap="nowrap" height="100vh" px="3">
          <RoomList selectedRoom={selectedRoom} onRoomClick={handleRoomClick}></RoomList>
        </Box>


        {/* Selected Room */}
        <Box flexGrow="8" mx="5">

          <Box display="flex" flexWrap="wrap" flexDirection="row">

            <Box display="flex" flexWrap="wrap" flexDirection="column" width={[300, 300, 400, 500]}>
              <BoardList onBoardClick={handleBoardClick} onEnterClick={handleEnterBoard} selectedRoom={selectedRoom}></BoardList>
            </Box>

          </Box>
        </Box>

      </Box>

      {/* The Corner SAGE3 Image */}
      <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', opacity: 0.8 }}>
        <img src={imageUrl} width="75px" alt="" />
      </div>

    </div>
  );
}

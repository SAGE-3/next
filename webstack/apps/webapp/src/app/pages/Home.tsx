/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, useColorModeValue } from '@chakra-ui/react';

import { BoardSchema, RoomSchema } from '@sage3/shared/types';
import { useState } from 'react';
import { AppList } from '../components/AppList';

import { BoardList } from '../components/BoardList';
import { Header } from '../components/Header';
import { RoomList } from '../components/RoomList';

export function HomePage() {

  const [selectedRoom, setSelectedRoom] = useState<RoomSchema | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<BoardSchema | null>(null);

  const imageUrl = useColorModeValue("/assets/SAGE3LightMode.png", "/assets/SAGE3DarkMode.png");

  function handleRoomClick(room: RoomSchema) {
    setSelectedRoom(room);
  }

  function handleBoardClick(board: BoardSchema) {
    setSelectedBoard(board);
  }

  return (
    <div>
      <Header title={(selectedRoom) ? selectedRoom.name : "Select a Room"}></Header>

      <Box display="flex" flexDirection="row" flexWrap="nowrap">

        {/* List of Rooms Sidebar */}
        <Box display='flex' flexGrow="0" flexDirection="column" flexWrap="nowrap" height="100vh" px="3">
          <RoomList selectedRoom={selectedRoom} onRoomClick={handleRoomClick}></RoomList>
        </Box>


        {/* Selected Room */}
        <Box flexGrow="8" mx="5">

          <Box display="flex" flexWrap="wrap" flexDirection="row">

            <Box display="flex" flexWrap="wrap" flexDirection="column" width={[300, 300, 400, 500]}>
              <BoardList onBoardClick={handleBoardClick} selectedRoom={selectedRoom}></BoardList>
            </Box>

            <Box display="flex" flexWrap="wrap" flexDirection="row" p="10">
              {/* TEMP APPS AREA */}
              {(selectedBoard && selectedRoom) ? <AppList selectedBoard={selectedBoard} selectedRoom={selectedRoom}></AppList> : null}

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

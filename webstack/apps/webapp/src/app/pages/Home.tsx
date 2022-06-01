// import create from "zustand";

import { Box, Button, Divider } from '@chakra-ui/react';
import {

  CreateRoomModal,
  useRoomStore,
  useBoardStore,
  CreateBoardModal,
  BoardCard,
  RoomCard,
} from '@sage3/frontend';
import { RoomSchema } from '@sage3/shared/types';
import { useEffect, useState } from 'react';
import { Header } from '../components/Header';

export function HomePage() {

  const rooms = useRoomStore((state) => state.rooms);
  const deleteRoom = useRoomStore((state) => state.delete);
  const subToAllRooms = useRoomStore((state) => state.subscribeToAllRooms);
  useEffect(() => {
    subToAllRooms()
  }, [])

  const boards = useBoardStore((state) => state.boards);
  const deleteBoard = useBoardStore((state) => state.delete);
  const subByRoomId = useBoardStore((state) => state.subscribeByRoomId);

  const [newRoomModal, setNewRoomModal] = useState(false);
  const [newBoardModal, setNewBoardModal] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<RoomSchema | null>(null);

  return (
    <div>
      <Header title="HomePage"></Header>

      <CreateRoomModal isOpen={newRoomModal} onClose={() => setNewRoomModal(false)}></CreateRoomModal>

      {currentRoom ? (
        <CreateBoardModal roomId={currentRoom.id} isOpen={newBoardModal} onClose={() => setNewBoardModal(false)}></CreateBoardModal>
      ) : null}

      <Divider my="2"></Divider>
      <div style={{ width: '400px' }}>
        <Button onClick={() => setNewRoomModal(true)}>New Room</Button>
        <Box display='flex' flexWrap="wrap" width="100vw ">
          {rooms.map((room) => {
            return (
              <RoomCard
                key={room.id}
                room={room}
                onEnter={() => { setCurrentRoom(room); subByRoomId(room.id) }}
                onEdit={() => console.log('edit room')}
                onDelete={() => deleteRoom(room.id)}
              ></RoomCard>
            )
          })}
        </Box>
      </div>

      <Divider my="2"></Divider>
      <div style={{ width: '400px' }}>
        <h1>{currentRoom ? currentRoom.name : 'Select a Room'}</h1>
        {currentRoom ? <Button onClick={() => setNewBoardModal(true)}>New Board</Button> : null}
        <Box display='flex' flexWrap="wrap" width="100vw ">
          {currentRoom ? (
            boards.map((board) => {
              return (
                <BoardCard
                  key={board.id}
                  board={board}
                  onDelete={() => deleteBoard(board.id)}
                  onEdit={() => { console.log('edit board') }}
                  onEnter={() => { console.log('enter board') }}></BoardCard>
              );
            })
          ) : (
            <div>NO ROOM SELECTED</div>
          )}
        </Box>
      </div>


    </div>
  );
}

// import create from "zustand";

import { Box, Button, Icon, IconButton, Text } from '@chakra-ui/react';
import {

  CreateRoomModal,
  useRoomStore,
  useBoardStore,
  CreateBoardModal,
  BoardCard,
  RoomCard,
} from '@sage3/frontend';
import { sageColorByName } from '@sage3/shared';
import { RoomSchema } from '@sage3/shared/types';
import { useEffect, useState } from 'react';
import { MdSettings } from 'react-icons/md';
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
      <Header title="SAGE3"></Header>

      <CreateRoomModal isOpen={newRoomModal} onClose={() => setNewRoomModal(false)}></CreateRoomModal>

      {currentRoom ? (
        <CreateBoardModal roomId={currentRoom.id} isOpen={newBoardModal} onClose={() => setNewBoardModal(false)}></CreateBoardModal>
      ) : null}

      <Box display="flex" flexDirection="row" flexWrap="nowrap">

        <Box display='flex' flexDirection="column" flexWrap="nowrap" height="100vh" px="3">
          {rooms.map((room) => {
            return (
              <RoomCard
                key={room.id}
                room={room}
                selected={(currentRoom) ? room.id === currentRoom.id : false}
                onEnter={() => { setCurrentRoom(room); subByRoomId(room.id) }}
                onEdit={() => console.log('edit room')}
                onDelete={() => deleteRoom(room.id)}
              ></RoomCard>
            )
          })}
          <Button
            height="60px"
            width="60px"
            m="2"
            borderRadius='lg'
            border="solid white 2px"
            fontSize="48px"
            p="0"
            _hover={{ transform: "scale(1.1)" }}
            onClick={() => setNewRoomModal(true)}>
            <Text
              fontSize='4xl'
              fontWeight="bold"
              style={{
                transform: "translateY(-3px)"
              }}>+</Text>
          </Button>
        </Box>


        <Box display='flex' flexWrap="nowrap" flexDirection="column" alignItems="stretch" mx="4" width="25vw">

          <Box display="flex" alignItems="center" flexDirection="row" justifyContent="space-between">
            <Text
              fontSize='4xl'
            >{(currentRoom) ? currentRoom.name : "Select a Room"}
            </Text>
            <Box>
              <IconButton
                variant='ghost'
                colorScheme='teal'
                aria-label='Edit Board'
                size='lg'
                mx="1"
                icon={<MdSettings />}
              />
            </Box>

          </Box>


          <Box display="flex" flexWrap="wrap" flexDirection="column">
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
              null
            )}
            {currentRoom ?
              <Button
                border="solid white 2px"
                my="2"
                transition="transform .1s"
                _hover={{ transform: "scale(1.1)" }}
                onClick={() => setNewBoardModal(true)}><Text
                  fontSize='4xl'
                  fontWeight="bold"
                  style={{

                    transform: "translateY(-3px)"
                  }}>+</Text></Button>
              : null}
          </Box>
        </Box>

      </Box>
    </div>
  );
}

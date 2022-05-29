// import create from "zustand";

import { Button, Divider, Tag, TagCloseButton, TagLabel, VStack } from '@chakra-ui/react';
import {
  AuthHTTPService,
  CreateUserModal,
  useUserStore,
  EditUserModal,
  CreateRoomModal,
  useRoomStore,
  useBoardStore,
  CreateBoardModal,
  useAppStore,
} from '@sage3/frontend';
import { RoomSchema } from '@sage3/shared/types';
import { useEffect, useState } from 'react';

export function HomePage() {
  const user = useUserStore((state) => state.user);
  const subToUser = useUserStore((state) => state.subscribeToCurrentUser);

  const rooms = useRoomStore((state) => state.rooms);
  const deleteRoom = useRoomStore((state) => state.delete);
  const subToAllRooms = useRoomStore((state) => state.subscribeToAllRooms);

  const boards = useBoardStore((state) => state.boards);
  const deleteBoard = useBoardStore((state) => state.delete);
  const subByRoomId = useBoardStore((state) => state.subscribeByRoomId);

  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);
  const subByBoardId = useAppStore((state) => state.subscribeByBoardId);

  const [newUserModal, setNewUserModal] = useState(false);
  const [editAccountModal, setEditAccountModal] = useState(false);
  const [newRoomModal, setNewRoomModal] = useState(false);
  const [newBoardModal, setNewBoardModal] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<RoomSchema | null>(null);

  useEffect(() => {
    async function subUser() {
      const user = await subToUser();
      if (user === undefined) {
        setNewUserModal(true);
      } else {
        setNewUserModal(false);
      }
    }
    subUser();
    subToAllRooms();
  }, []);

  return (
    <div>
      <h1>HOME PAGE</h1>

      <h3>
        {user?.name} - {user?.email}
      </h3>

      <Button onClick={() => setEditAccountModal(true)}>EDIT</Button>

      <Button onClick={AuthHTTPService.logout}>Logout</Button>
      <CreateUserModal isOpen={newUserModal} onClose={() => setNewUserModal(false)}></CreateUserModal>
      <EditUserModal isOpen={editAccountModal} onClose={() => setEditAccountModal(false)}></EditUserModal>
      <CreateRoomModal isOpen={newRoomModal} onClose={() => setNewRoomModal(false)}></CreateRoomModal>

      {currentRoom ? (
        <CreateBoardModal roomId={currentRoom.id} isOpen={newBoardModal} onClose={() => setNewBoardModal(false)}></CreateBoardModal>
      ) : null}

      <Divider my="2"></Divider>
      <div style={{ width: '400px' }}>
        <Button onClick={() => setNewRoomModal(true)}>New Room</Button>
        <VStack>
          {rooms.map((room) => {
            return (
              <Tag
                size="lg"
                key={room.id}
                borderRadius="full"
                variant="solid"
                colorScheme={room.color}
                onClick={() => {
                  setCurrentRoom(room);
                  subByRoomId(room.id);
                }}
              >
                <TagLabel>
                  {room.name} - {room.id}
                </TagLabel>
                <TagCloseButton onClick={() => deleteRoom(room.id)} />
              </Tag>
            );
          })}
        </VStack>
      </div>

      <Divider my="2"></Divider>
      <div style={{ width: '400px' }}>
        <h1>{currentRoom ? currentRoom.name : 'Select a Room'}</h1>
        {currentRoom ? <Button onClick={() => setNewBoardModal(true)}>New Board</Button> : null}
        <VStack>
          {currentRoom ? (
            boards.map((board) => {
              return (
                <Tag size="lg" key={board.id} borderRadius="full" variant="solid" colorScheme={board.color}>
                  <TagLabel>
                    {board.name} - {board.roomId}
                  </TagLabel>
                  <TagCloseButton onClick={() => deleteBoard(board.id)} />
                </Tag>
              );
            })
          ) : (
            <div>NO ROOM SELECTED</div>
          )}
        </VStack>
      </div>

      <Divider my="2"></Divider>
      <div style={{ width: '400px' }}>
        <h1>{currentRoom ? currentRoom.name : 'Select a Room'}</h1>
        {currentRoom ? <Button onClick={() => setNewBoardModal(true)}>New Board</Button> : null}
        <VStack>
          {currentRoom ? (
            boards.map((board) => {
              return (
                <Tag size="lg" key={board.id} borderRadius="full" variant="solid" colorScheme={board.color}>
                  <TagLabel>
                    {board.name} - {board.roomId}
                  </TagLabel>
                  <TagCloseButton onClick={() => deleteBoard(board.id)} />
                </Tag>
              );
            })
          ) : (
            <div>NO ROOM SELECTED</div>
          )}
        </VStack>
      </div>
    </div>
  );
}

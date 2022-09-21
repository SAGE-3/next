/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { Button, Text, Tooltip, useColorModeValue, useToast } from '@chakra-ui/react';

import { SBDocument } from '@sage3/sagebase';
import { RoomSchema } from '@sage3/shared/types';
import { CreateRoomModal, RoomCard, usePresenceStore, useRoomStore } from '@sage3/frontend';
import { useUser, useAuth } from '@sage3/frontend';

type RoomListProps = {
  onRoomClick: (room: SBDocument<RoomSchema>) => void;
  selectedRoom: SBDocument<RoomSchema> | null;
};

export function RoomList(props: RoomListProps) {
  // Me
  const { user } = useUser();
  const { auth } = useAuth();
  // Data stores
  const rooms = useRoomStore((state) => state.rooms);
  const storeError = useRoomStore((state) => state.error);
  const clearError = useRoomStore((state) => state.clearError);
  const deleteRoom = useRoomStore((state) => state.delete);
  const subToAllRooms = useRoomStore((state) => state.subscribeToAllRooms);
  const presences = usePresenceStore((state) => state.presences);
  // UI elements
  const borderColor = useColorModeValue('#718096', '#A0AEC0');
  const toast = useToast();

  useEffect(() => {
    if (storeError) {
      // Display a message
      toast({ description: 'Error - ' + storeError, duration: 3000, isClosable: true });
      // Clear the error
      clearError();
    }
  }, [storeError]);

  useEffect(() => {
    subToAllRooms();
  }, [subToAllRooms]);

  const [newRoomModal, setNewRoomModal] = useState(false);
  return (
    <>
      <Tooltip label="Create a room" hasArrow placement="top-start">
        <Button
          height="60px"
          width="60px"
          m="2"
          borderRadius="md"
          border={`solid ${borderColor} 2px`}
          fontSize="48px"
          p="0"
          _hover={{ transform: 'scale(1.1)' }}
          disabled={auth?.provider === 'guest'}
          onClick={() => setNewRoomModal(true)}
        >
          <Text fontSize="4xl" fontWeight="bold" transform={'translateY(-3px)'}>
            +
          </Text>
        </Button>
      </Tooltip>
      {rooms
        // show only public rooms or mine
        .filter((a) => a.data.isListed || a.data.ownerId === user?._id)
        .sort((a, b) => a.data.name.localeCompare(b.data.name))
        .map((room) => {
          return (
            <RoomCard
              key={room._id}
              room={room}
              userCount={presences.filter((p) => p.data.roomId === room._id).length}
              selected={props.selectedRoom ? room._id === props.selectedRoom._id : false}
              onEnter={() => props.onRoomClick(room)}
              onEdit={() => console.log('edit room')}
              onDelete={() => deleteRoom(room._id)}
            ></RoomCard>
          );
        })}

      <CreateRoomModal isOpen={newRoomModal} onClose={() => setNewRoomModal(false)}></CreateRoomModal>
    </>
  );
}

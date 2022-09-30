/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { Box, Button, Input, InputGroup, InputRightElement, Text, Tooltip, useColorModeValue, useToast } from '@chakra-ui/react';

import { SBDocument } from '@sage3/sagebase';
import { Room, RoomSchema } from '@sage3/shared/types';
import { CreateRoomModal, RoomCard, usePresenceStore, useRoomStore } from '@sage3/frontend';
import { useUser, useAuth } from '@sage3/frontend';
import { MdSearch } from 'react-icons/md';

type RoomListProps = {
  onRoomClick: (room: SBDocument<RoomSchema>) => void;
  selectedRoom: Room | undefined;
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
  const [filterBoards, setFilterBoards] = useState<Room[] | null>(null);
  const [search, setSearch] = useState('');

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
  // Filter boards with the search string
  function handleFilterBoards(event: any) {
    setSearch(event.target.value);
    const filBoards = rooms.filter((room) => room.data.name.toLowerCase().includes(event.target.value.toLowerCase()));
    setFilterBoards(filBoards);
    if (event.target.value === '') {
      setFilterBoards(null);
    }
  }

  const [scrollPos, setScrollPos] = useState(0);
  const handleScrollEvent = (e: any) => {
    console.log(e.deltaY, scrollPos);
    if (e.deltaY > 0) {
      setScrollPos(Math.min(0, scrollPos + 30));
    } else {
      setScrollPos(scrollPos - 30);
    }
  };
  return (
    <Box
      height="100%"
      borderColor="gray.500"
      borderWidth="3px"
      borderRadius="md"
      backgroundColor="gray.700"
      boxShadow="xl"
      p="4"
      overflow="hidden"
    >
      <InputGroup>
        <Input
          my="2"
          value={search}
          onChange={handleFilterBoards}
          placeholder="Search Boards..."
          _placeholder={{ opacity: 1, color: 'gray.600' }}
        />
        <InputRightElement pointerEvents="none" transform={`translateY(8px)`} fontSize="1.4em" children={<MdSearch />} />
      </InputGroup>
      <Tooltip label="Create a room" hasArrow placement="top-start">
        <Button
          height="60px"
          width="100%"
          borderRadius="md"
          border={`solid ${borderColor} 2px`}
          fontSize="48px"
          p="0"
          disabled={auth?.provider === 'guest'}
          onClick={() => setNewRoomModal(true)}
        >
          <Text fontSize="4xl" fontWeight="bold" transform={'translateY(-3px)'}>
            +
          </Text>
        </Button>
      </Tooltip>
      <Box overflow="hidden" height="100%" mt="2" borderTop="solid gray 2px" onWheel={handleScrollEvent}>
        <Box transform={`translateY(${scrollPos + 'px'})`} transition="transform 0.2s">
          {(filterBoards ? filterBoards : rooms)
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
        </Box>
      </Box>
      <CreateRoomModal isOpen={newRoomModal} onClose={() => setNewRoomModal(false)}></CreateRoomModal>
    </Box>
  );
}

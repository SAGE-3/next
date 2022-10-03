/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { ChangeEvent, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  GridItem,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  SimpleGrid,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';

import { Room } from '@sage3/shared/types';
import { CreateRoomModal, RoomCard, usePresenceStore, useRoomStore } from '@sage3/frontend';
import { useUser, useAuth } from '@sage3/frontend';
import { MdSearch } from 'react-icons/md';

type RoomListProps = {
  onRoomClick: (room: Room) => void;
  selectedRoom: Room | undefined;
  rooms: Room[];
};

export function RoomList(props: RoomListProps) {
  // Me
  const { user } = useUser();
  const { auth } = useAuth();
  // Data stores
  const storeError = useRoomStore((state) => state.error);
  const clearError = useRoomStore((state) => state.clearError);
  const deleteRoom = useRoomStore((state) => state.delete);
  const presences = usePresenceStore((state) => state.presences);

  // UI elements
  const borderColor = useColorModeValue('#718096', '#A0AEC0');
  const toast = useToast();
  const [filterBoards, setFilterBoards] = useState<Room[] | null>(null);
  const [search, setSearch] = useState('');

  const [newRoomModal, setNewRoomModal] = useState(false);
  const [sortBy, setSortBy] = useState<'Name' | 'Updated' | 'Created'>('Name');

  function sortByName(a: Room, b: Room) {
    return b.data.name.localeCompare(a.data.name);
  }

  function sortByUpdated(a: Room, b: Room) {
    return a._updatedAt < b._updatedAt ? -1 : 1;
  }

  function sortByCreated(a: Room, b: Room) {
    return a._createdAt < b._createdAt ? -1 : 1;
  }

  let sortFunction = sortByName;
  if (sortBy === 'Updated') sortFunction = sortByUpdated;
  if (sortBy === 'Created') sortFunction = sortByCreated;

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(event.target.value as any);
  };

  useEffect(() => {
    if (storeError) {
      // Display a message
      toast({ description: 'Error - ' + storeError, duration: 3000, isClosable: true });
      // Clear the error
      clearError();
    }
  }, [storeError]);

  // Filter boards with the search string
  function handleFilterBoards(event: any) {
    setSearch(event.target.value);
    const filBoards = props.rooms.filter((room) => room.data.name.toLowerCase().includes(event.target.value.toLowerCase()));
    setFilterBoards(filBoards);
    if (event.target.value === '') {
      setFilterBoards(null);
    }
  }

  return (
    <>
      <Box
        overflowY="auto"
        overflowX="hidden"
        pr="2"
        mb="2"
        maxHeight="60vh"
        css={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'gray',
            borderRadius: '8px',
          },
        }}
      >
        <SimpleGrid minChildWidth="400px" spacingX={6} spacingY={3} height="100%">
          {(filterBoards ? filterBoards : props.rooms)
            // show only public rooms or mine
            .filter((a) => a.data.isListed || a.data.ownerId === user?._id)
            .sort(sortFunction)
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
        </SimpleGrid>
      </Box>
      <Box>
        <CreateRoomModal isOpen={newRoomModal} onClose={() => setNewRoomModal(false)}></CreateRoomModal>
        <Tooltip label="Create a New Room" placement="top" hasArrow={true} openDelay={400}>
          <Button
            height="51px"
            width="100%"
            borderRadius="md"
            border={`solid ${borderColor} 1px`}
            fontSize="48px"
            p="0"
            disabled={auth?.provider === 'guest'}
            onClick={() => setNewRoomModal(true)}
          >
            <Text fontSize="4xl" fontWeight="bold">
              +
            </Text>
          </Button>
        </Tooltip>
        <InputGroup>
          <Select mt="2" onChange={handleSortChange}>
            <option value="Name"> Name</option>
            <option value="Updated">Updated</option>
            <option value="Created">Created</option>
          </Select>
        </InputGroup>
        <InputGroup>
          <Input
            my="2"
            value={search}
            variant="flushed"
            onChange={handleFilterBoards}
            placeholder="Search Rooms..."
            _placeholder={{ opacity: 1 }}
            color="white"
          />
          <InputRightElement pointerEvents="none" transform={`translateY(8px)`} fontSize="1.4em" children={<MdSearch />} />
        </InputGroup>
      </Box>
    </>
  );
}

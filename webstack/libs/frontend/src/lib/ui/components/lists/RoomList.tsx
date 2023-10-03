/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdAdd, MdSearch, MdSort } from 'react-icons/md';

import {
  CreateRoomModal,
  EnterBoardByIdModal,
  RoomCard,
  useHexColor,
  useRoomStore,
  useUser,
  useAbility,
  useThrottlePresenceUsers,
} from '@sage3/frontend';
import { Board, Room } from '@sage3/shared/types';

type RoomListProps = {
  onRoomClick: (room: Room | undefined) => void;
  selectedRoom: Room | undefined;
  rooms: Room[];
  boards: Board[];

  onBackClick: () => void;
  onBoardClick: (board: Board) => void;
};

export function RoomList(props: RoomListProps) {
  // Me
  const { user } = useUser();

  // Abilities
  const canCreateRoom = useAbility('create', 'rooms');

  // Data stores
  const storeError = useRoomStore((state) => state.error);
  const clearError = useRoomStore((state) => state.clearError);
  const deleteRoom = useRoomStore((state) => state.delete);
  const presences = useThrottlePresenceUsers(5000, '');

  // UI elements
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const borderHex = useHexColor(borderColor);

  // Create room dialog
  const { isOpen, onOpen, onClose } = useDisclosure();

  const toast = useToast();
  const [filterBoards, setFilterBoards] = useState<Room[] | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'Name' | 'Users' | 'Created'>('Name');

  const selRoomCardRef = useRef<any>();

  // Enter Board by ID Modal
  const { isOpen: isOpenEnterBoard, onOpen: onOpenEnterBoard, onClose: onCloseEnterBoard } = useDisclosure();

  useEffect(() => {
    if (props.selectedRoom) {
      if (selRoomCardRef.current) {
        selRoomCardRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }
  }, [props.selectedRoom]);

  function sortByName(a: Room, b: Room) {
    return a.data.name.localeCompare(b.data.name);
  }

  function sortByUsers(a: Room, b: Room) {
    const aUsers = presences.filter((p) => p.presence.data.roomId === a._id).length;
    const bUsers = presences.filter((p) => p.presence.data.roomId === b._id).length;
    return bUsers - aUsers;
  }

  function sortByCreated(a: Room, b: Room) {
    return a._createdAt > b._createdAt ? -1 : 1;
  }

  // Sorting functions
  let sortFunction = sortByName;
  if (sortBy === 'Users') sortFunction = sortByUsers;
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
  function handleFilterBoards(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
    const filBoards = props.rooms.filter(
      (room) =>
        // search in room name
        room.data.name.toLowerCase().includes(event.target.value.toLowerCase()) ||
        // search in room description
        room.data.description.toLowerCase().includes(event.target.value.toLowerCase())
    );
    setFilterBoards(filBoards);
    if (event.target.value === '') {
      setFilterBoards(null);
    }
  }

  return (
    <Box textAlign="center" display="flex" flexDir="column" height="100%" width="100%" borderBottom="solid 1px" borderColor={borderColor}>
      <EnterBoardByIdModal isOpen={isOpenEnterBoard} onOpen={onOpenEnterBoard} onClose={onCloseEnterBoard}></EnterBoardByIdModal>
      <Box textAlign="center" display="flex" flexDir="column" alignItems="center" width="100%" borderColor={borderColor}>
        <Box whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" fontSize={'3xl'}>
          <Text>Rooms</Text>
        </Box>
        <Box display="flex" justifyContent={'space-between'} width="100%">
          <Box flexGrow={1} mr="4" display="flex" flexWrap={'nowrap'} alignItems={'center'}>
            <Box display="flex" flexWrap={'nowrap'} justifyContent="left">
              <Tooltip label="Create a New Room" placement="top" hasArrow={true} openDelay={400}>
                <Button aria-label="create room" borderRadius="md" mr="2" fontSize="3xl" isDisabled={!canCreateRoom} onClick={onOpen}>
                  <MdAdd />
                </Button>
              </Tooltip>
            </Box>
            <Box flexGrow={1} ml="4">
              <InputGroup>
                <Input
                  my="2"
                  value={search}
                  variant="outline"
                  onChange={handleFilterBoards}
                  placeholder="Find Room..."
                  _placeholder={{ opacity: 1 }}
                  name="findRoom"
                />
                <InputRightElement pointerEvents="none" transform={`translateY(8px)`} fontSize="1.4em" children={<MdSearch />} />
              </InputGroup>
            </Box>
          </Box>
          <Box pr="4">
            <InputGroup>
              <Select name="sortRoom" mt="2" onChange={handleSortChange} icon={<MdSort />}>
                <option value="Name"> Name</option>
                <option value="Users">Users</option>
                <option value="Created">Created</option>
              </Select>
            </InputGroup>
          </Box>
        </Box>
      </Box>

      <Box
        overflowY="scroll"
        overflowX="hidden"
        pr="2"
        mt="6"
        height="100%"
        borderColor={borderColor}
        css={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: borderHex,
            borderRadius: '8px',
          },
        }}
      >
        <ul>
          {(filterBoards ? filterBoards : props.rooms)
            // show only public rooms or mine
            .filter((a) => a.data.isListed || a.data.ownerId === user?._id)
            .sort(sortFunction)
            .map((room, idx) => {
              const selected = props.selectedRoom ? room._id === props.selectedRoom._id : false;

              return (
                <li key={idx} ref={selected ? selRoomCardRef : null} style={{ marginTop: idx === 0 ? '' : '20px' }}>
                  <RoomCard
                    key={room._id}
                    room={room}
                    boards={props.boards.filter((board) => board.data.roomId === room._id)}
                    userCount={presences.filter((user) => user.presence.data.roomId === room._id).length}
                    selected={selected}
                    onEnter={() => props.onRoomClick(room)}
                    onDelete={() => deleteRoom(room._id)}
                    onBackClick={() => props.onRoomClick(undefined)}
                    onBoardClick={props.onBoardClick}
                  ></RoomCard>
                </li>
              );
            })}
        </ul>
      </Box>

      <CreateRoomModal isOpen={isOpen} onClose={onClose} />
    </Box>
  );
}

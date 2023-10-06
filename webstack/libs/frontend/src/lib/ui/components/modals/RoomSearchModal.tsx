/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Button,
  ModalCloseButton,
  Box,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  useColorModeValue,
} from '@chakra-ui/react';
import { Room } from '@sage3/shared/types';
import { MdSearch, MdSort } from 'react-icons/md';
import { RoomCard, useHexColor, useThrottlePresenceUsers, useUser } from '@sage3/frontend';

// import { SAGEColors } from '@sage3/shared';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
}

// Utility functions for sorting
function sortByName(a: Room, b: Room) {
  return a.data.name.localeCompare(b.data.name);
}

function sortByCreated(a: Room, b: Room) {
  return a._createdAt > b._createdAt ? -1 : 1;
}

// Type for representing the sort order
type userSortType = 'Name' | 'Users' | 'Created';

/**
 * Confirmation Modal
 * @param props
 * @returns
 */
export function RoomSearchModal(props: ConfirmModalProps): JSX.Element {
  const initialRef = useRef(null);
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<userSortType>('Name');
  const [filterBoards, setFilterBoards] = useState<Room[] | null>(null);
  const presences = useThrottlePresenceUsers(5000, '');

  // UI elements
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const borderHex = useHexColor(borderColor);
  function sortByUsers(a: Room, b: Room) {
    const aUsers = presences.filter((p) => p.presence.data.roomId === a._id).length;
    const bUsers = presences.filter((p) => p.presence.data.roomId === b._id).length;
    return bUsers - aUsers;
  }
  // Sorting functions
  let sortFunction = sortByName;
  if (sortBy === 'Users') sortFunction = sortByUsers;
  if (sortBy === 'Created') sortFunction = sortByCreated;

  // Filter boards with the search string
  function handleFilterBoards(search: string) {
    const filBoards = props.rooms.filter(
      (room) =>
        // search in room name
        room.data.name.toLowerCase().includes(search.toLowerCase()) ||
        // search in room description
        room.data.description.toLowerCase().includes(search.toLowerCase())
    );
    setFilterBoards(filBoards);
    if (search === '') {
      setFilterBoards(null);
    }
  }

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(event.target.value as userSortType);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    handleFilterBoards(event.target.value);
  };

  const handleClose = () => {
    setSearch('');
    handleFilterBoards('');
    props.onClose();
  };

  return (
    <Modal size="3xl" isOpen={props.isOpen} onClose={handleClose} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent backgroundColor="#313131">
        <ModalHeader fontSize="3xl">Search for Rooms</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box display="flex" justifyContent={'space-between'} width="100%">
            <Box flexGrow={1} mr="4" display="flex" flexWrap={'nowrap'} alignItems={'center'}>
              <Box flexGrow={1}>
                <InputGroup>
                  <Input
                    ref={initialRef}
                    my="2"
                    value={search}
                    variant="outline"
                    onChange={handleInputChange}
                    placeholder="Find Room..."
                    _placeholder={{ opacity: 1 }}
                    name="findRoom"
                  />
                  <InputRightElement pointerEvents="none" transform={`translateY(8px)`} fontSize="1.4em" children={<MdSearch />} />
                </InputGroup>
              </Box>
            </Box>
            <Box>
              <InputGroup>
                <Select name="sortRoom" mt="2" onChange={handleSortChange} icon={<MdSort />}>
                  <option value="Name"> Name</option>
                  <option value="Users">Users</option>
                  <option value="Created">Created</option>
                </Select>
              </InputGroup>
            </Box>
          </Box>
          <Box
            overflowY="scroll"
            overflowX="hidden"
            mt="6"
            height="60vh"
            maxHeight="60vh"
            borderColor={borderColor}
            css={{
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              '&::-webkit-scrollbar-track': {
                display: 'none',
              },
              '&::-webkit-scrollbar-thumb': {
                display: 'none',
              },
            }}
          >
            <ul>
              {(filterBoards ? filterBoards : props.rooms)
                // show only public rooms or mine
                .filter((a) => a.data.isListed || a.data.ownerId === user?._id)
                .sort(sortFunction)
                .map((room, idx) => {
                  return (
                    <li key={idx} style={{ marginTop: idx === 0 ? '' : '20px' }}>
                      <RoomCard
                        key={room._id}
                        room={room}
                        boards={[]}
                        userCount={presences.filter((user) => user.presence.data.roomId === room._id).length}
                        selected={false}
                        onEnter={() => {}}
                        onDelete={() => {}}
                        onBackClick={() => {}}
                        onBoardClick={() => {}}
                      ></RoomCard>
                    </li>
                  );
                })}
            </ul>
          </Box>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="gray" onClick={props.onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

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
  Icon,
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
import { MdAdd, MdSearch } from 'react-icons/md';

import {
  CreateRoomModal,
  EnterBoardByIdModal,
  RoomCard,
  useHexColor,
  useRoomStore,
  useUser,
  useAbility,
  useThrottlePresenceUsers,
  useUIStore,
  RoomSearchModal,
} from '@sage3/frontend';
import { Board, Room } from '@sage3/shared/types';

// Props for the RoomList component
type RoomListProps = {
  onRoomClick: (room: Room | undefined) => void;
  selectedRoom: Room | undefined;
  rooms: Room[];
  boards: Board[];

  onBackClick: () => void;
  onBoardClick: (board: Board) => void;
};

// Utility functions for sorting
function sortByName(a: Room, b: Room) {
  return a.data.name.localeCompare(b.data.name);
}

export function RoomList(props: RoomListProps) {
  // Me
  const { user } = useUser();
  const savedRooms = user?.data.savedRooms || [];
  const isGuest = user?.data.userRole === 'guest' || false;

  // Room Search Discloure Modal
  const { isOpen: roomSearchIsOpen, onOpen: roomSearchOnOpen, onClose: roomSearchOnClose } = useDisclosure();
  const handleRoomSearchOpen = () => {
    roomSearchOnOpen();
  };

  // Abilities
  const canCreateRoom = useAbility('create', 'rooms');

  // Data stores
  const storeError = useRoomStore((state) => state.error);
  const clearError = useRoomStore((state) => state.clearError);
  const deleteRoom = useRoomStore((state) => state.delete);
  const presences = useThrottlePresenceUsers(5000, '');
  const { roomlistShowFavorites: showFavorites, setroomlistShowFavorites } = useUIStore((state) => state);

  // UI elements
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const borderHex = useHexColor(borderColor);

  // Create room dialog
  const { isOpen, onOpen, onClose } = useDisclosure();

  const toast = useToast();

  // Display Rooms
  const [displayRooms, setDisplayRooms] = useState<Room[]>([]);

  const selRoomCardRef = useRef<HTMLLIElement>(null);

  // Enter Board by ID Modal
  const { isOpen: isOpenEnterBoard, onOpen: onOpenEnterBoard, onClose: onCloseEnterBoard } = useDisclosure();

  // State of UI, saved or search
  const handleShowMyRooms = () => {
    setroomlistShowFavorites(false);
  };
  const handleShowFavorites = () => {
    setroomlistShowFavorites(true);
  };

  // Scroll to selected room
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

  useEffect(() => {
    if (isGuest) {
      setroomlistShowFavorites(false);
    }
  }, []);

  useEffect(() => {
    if (storeError) {
      // Display a message
      toast({ description: 'Error - ' + storeError, duration: 3000, isClosable: true });
      // Clear the error
      clearError();
    }
  }, [storeError]);

  useEffect(() => {
    if (showFavorites) {
      setDisplayRooms(props.rooms.filter((room) => savedRooms.includes(room._id)));
    } else {
      setDisplayRooms(props.rooms.filter((room) => room._createdBy === user?._id));
    }
  }, [showFavorites, props.rooms]);

  return (
    <Box textAlign="center" display="flex" flexDir="column" height="100%" width="100%" borderBottom="solid 1px" borderColor={borderColor}>
      {/* Modal to enter the room with a UUID */}
      <EnterBoardByIdModal isOpen={isOpenEnterBoard} onOpen={onOpenEnterBoard} onClose={onCloseEnterBoard}></EnterBoardByIdModal>
      {/* Room Search Modal */}
      <RoomSearchModal isOpen={roomSearchIsOpen} onClose={roomSearchOnClose} rooms={props.rooms} />

      {/* The room list */}
      <Box textAlign="center" display="flex" flexDir="column" alignItems="center" width="100%" borderColor={borderColor}>
        <Box whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" fontSize={'3xl'}>
          <Text>Rooms</Text>
        </Box>

        <Box display="flex" width="100%" justifyContent={'space-between'} my="2">
          <Button width="64px" mr="2" colorScheme="teal" variant="outline" onClick={onOpen}>
            <Icon as={MdAdd} fontSize={18} />
          </Button>
          <Button width="64px" mx="2" colorScheme="teal" variant="outline" onClick={handleRoomSearchOpen}>
            <Icon as={MdSearch} fontSize={18} />
          </Button>
          <Button width="100%" mx="2" colorScheme={showFavorites ? 'teal' : 'gray'} variant="solid" onClick={handleShowFavorites}>
            Favorite Rooms
          </Button>

          <Button width="100%" ml="2" colorScheme={!showFavorites ? 'teal' : 'gray'} variant="solid" onClick={handleShowMyRooms}>
            My Rooms
          </Button>
        </Box>
      </Box>

      <Box
        overflowY="scroll"
        overflowX="hidden"
        mt="6"
        height="100%"
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
          {displayRooms.sort(sortByName).map((room, idx) => {
            const selected = props.selectedRoom ? room._id === props.selectedRoom._id : false;

            if (showFavorites && !savedRooms.includes(room._id)) return null;

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

      {/* Modal to create a room */}
      <CreateRoomModal isOpen={isOpen} onClose={onClose} />
    </Box>
  );
}

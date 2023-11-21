/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Text,
  ModalCloseButton,
  Box,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Tag,
} from '@chakra-ui/react';

import { useHexColor, useRoomStore, useUser } from '@sage3/frontend';
import { MdSearch } from 'react-icons/md';
import { Room } from '@sage3/shared/types';

// Props for the AboutModal
interface RoomSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * About Modal
 * @param props
 * @returns
 */
export function RoomSearchModal(props: RoomSearchModalProps): JSX.Element {
  // Room Store
  const { rooms } = useRoomStore((state) => state);

  // Search Term
  const [searchTerm, setSearchTerm] = useState('');

  // Handle Search Term Change
  const handleSearchTermChange = (event: any) => {
    setSearchTerm(event.target.value);
  };

  // Room Search Filter
  const filterRooms = (room: Room) => {
    return room.data.name.includes(searchTerm) || room.data.description.includes(searchTerm);
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} isCentered size="3xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize={'3xl'}>Room Search</ModalHeader>
        <ModalCloseButton />
        <ModalBody px={8} pb={8}>
          <InputGroup mb="4">
            <InputLeftElement pointerEvents="none">
              <MdSearch color="gray.300" />
            </InputLeftElement>
            <Input type="tel" placeholder="Room Search..." onChange={handleSearchTermChange} />
          </InputGroup>
          <Box display="flex" flexDir="column" textAlign={'left'} gap="3" height="50vh" overflowY={'scroll'} pr="4">
            {rooms.filter(filterRooms).map((room) => (
              <RoomRow room={room} />
            ))}
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

interface RoomRowProps {
  room: Room;
}

function RoomRow(props: RoomRowProps) {
  const { user } = useUser();
  const userId = user ? user._id : '';

  // Colors
  const borderColorValue = useColorModeValue(props.room.data.color, props.room.data.color);
  const borderColor = useHexColor(borderColorValue);
  const linearBGColor = useColorModeValue(
    `linear-gradient(180deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(180deg, #464545, #373737, #2f2e2e)`
  );

  // Room Store
  const { joinRoomMembership, leaveRoomMembership, members } = useRoomStore((state) => state);

  // Is this user a member of this room?
  const roomMember = members.find((roomMember) => roomMember.data.roomId === props.room._id);
  const isMember = roomMember ? roomMember.data.members.includes(userId) : false;
  const isOwner = props.room.data.ownerId === userId;

  // Check to see if the user is the owner but not a member in weird cases
  useEffect(() => {
    if (isOwner && !isMember) {
      joinRoomMembership(props.room._id);
    }
  }, []);

  const handleMembershipClick = () => {
    if (isOwner) {
      return;
    }
    if (isMember) {
      leaveRoomMembership(props.room._id);
    } else {
      // Join Room
      joinRoomMembership(props.room._id);
    }
  };

  return (
    <Box
      background={linearBGColor}
      p="1"
      px="2"
      display="flex"
      justifyContent={'space-between'}
      alignItems={'center'}
      borderRadius="md"
      boxSizing="border-box"
      border={`solid 1px ${'gray'}`}
      borderLeft={`${borderColor} solid 8px`}
      transition={'all 0.2s ease-in-out'}
    >
      <Box display="flex" flexDir="column" width="240px">
        <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="lg" fontWeight={'bold'}>
          {props.room.data.name}
        </Box>
        <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs">
          {props.room.data.description}
        </Box>
      </Box>
      <Box display="flex" gap="2px">
        {isOwner ? (
          <Tag size="md" width="140px" colorScheme="green">
            You are the Owner
          </Tag>
        ) : (
          <Button
            size="xs"
            variant={'solid'}
            width="140px"
            fontSize="sm"
            aria-label="enter-board"
            colorScheme={isMember ? 'red' : 'teal'}
            onClick={handleMembershipClick}
          >
            {isMember ? 'Leave' : 'Join'}
          </Button>
        )}
      </Box>
    </Box>
  );
}

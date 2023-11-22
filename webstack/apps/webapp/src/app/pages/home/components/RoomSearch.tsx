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

import { useEffect, useRef, useState } from 'react';
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
  ModalFooter,
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
  const searchColorValue = useColorModeValue('gray.900', 'gray.100');
  const searchColor = useHexColor(searchColorValue);

  // Initial Ref to focus on the input
  const initialRef = useRef<HTMLInputElement>(null);

  // Colors
  const scrollBarValue = useColorModeValue('gray.300', '#666666');
  const scrollBarColor = useHexColor(scrollBarValue);

  // Handle Search Term Change
  const handleSearchTermChange = (event: any) => {
    setSearchTerm(event.target.value);
  };

  // Room Search Filter that matches on name or description
  const filterRooms = (room: Room) => {
    return (
      room.data.name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()) ||
      room.data.description.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase())
    );
  };

  const onClose = () => {
    setSearchTerm('');
    props.onClose();
  };

  return (
    <Modal isOpen={props.isOpen} onClose={onClose} isCentered size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize={'3xl'}>Room Search</ModalHeader>
        <ModalBody px={8}>
          <InputGroup mb="4">
            <InputLeftElement pointerEvents="none">
              <MdSearch color="gray.300" />
            </InputLeftElement>
            <Input
              ref={initialRef}
              type="text"
              _placeholder={{ color: searchColor }}
              placeholder="Room Search..."
              onChange={handleSearchTermChange}
            />
          </InputGroup>
          <Box
            display="flex"
            flexDir="column"
            textAlign={'left'}
            gap="3"
            height="50vh"
            overflowY={'scroll'}
            pr="2"
            css={{
              '&::-webkit-scrollbar': {
                background: 'transparent',
                width: '5px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: scrollBarColor,
                borderRadius: '48px',
              },
            }}
          >
            {rooms
              .filter(filterRooms)
              .sort((a, b) => a.data.name.localeCompare(b.data.name))
              .map((room) => (
                <RoomRow key={room._id} room={room} />
              ))}
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
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
  const { joinRoomMembership, members } = useRoomStore((state) => state);

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

  const handleMembershipClick = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (isOwner) {
      return;
    }
    // Join Room
    joinRoomMembership(props.room._id);
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
        {isOwner || isMember ? (
          <Tag size="md" width="100px" colorScheme={isOwner ? 'green' : 'yellow'} justifyContent={'center'}>
            {isOwner ? 'Owner' : 'Member'}
          </Tag>
        ) : (
          <Button
            size="xs"
            variant={'solid'}
            width="100px"
            fontSize="sm"
            aria-label="enter-board"
            colorScheme={isMember ? 'red' : 'teal'}
            onClick={handleMembershipClick}
          >
            Join
          </Button>
        )}
      </Box>
    </Box>
  );
}

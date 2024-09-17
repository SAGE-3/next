/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React Imports
import { useRef, useState } from 'react';

// Chakra Imports
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Box,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Tag,
  ModalFooter,
  InputLeftAddon,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { v5 as uuidv5 } from 'uuid';

// Icons
import { MdLock, MdSearch } from 'react-icons/md';

// SAGE Imports
import { useConfigStore, useHexColor, useRoomStore, useUser } from '@sage3/frontend';
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
  // User
  const { user } = useUser();

  // Room Store
  const rooms = useRoomStore((state) => state.rooms);

  console.log('rooms', rooms);

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
  const searchRooms = (room: Room) => {
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
              .filter((room: Room) => room.data.isListed || (!room.data.isListed && room.data.ownerId === user?._id))
              .filter(searchRooms)
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
  const joinRoomMembership = useRoomStore((state) => state.joinRoomMembership);
  const members = useRoomStore((state) => state.members);

  // Password disclosure
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Is this user a member of this room?
  const roomMember = members.find((roomMember) => roomMember.data.roomId === props.room._id);
  const isMember = roomMember ? roomMember.data.members.includes(userId) : false;
  const isOwner = props.room.data.ownerId === userId;

  // Is password protected
  const isPasswordProtected = props.room.data.isPrivate;

  // Toast
  const toast = useToast();

  const handleMembershipClick = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (isOwner) {
      return;
    }
    // Check Password
    if (isPasswordProtected) {
      onOpen();
    } else {
      // Join Room
      joinRoomMembership(props.room._id);
      // Toast
      toast({
        title: `You have successfully joined ${props.room.data.name}`,
        status: 'success',
        duration: 4 * 1000,
        isClosable: true,
      });
    }
  };

  return (
    <>
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
              <Box mr="1">Join</Box>
              {isPasswordProtected && <MdLock />}
            </Button>
          )}
        </Box>
      </Box>
      <PasswordJoinRoomModal isOpen={isOpen} onClose={onClose} room={props.room} />
    </>
  );
}

type PasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
};

export function PasswordJoinRoomModal(props: PasswordModalProps): JSX.Element {
  // Configuration information
  const config = useConfigStore((state) => state.config);
  // Reference to the input field
  const initialRef = useRef<HTMLInputElement>(null);

  // Toast for information feedback
  const toast = useToast();

  // Private information setter and getter
  const [privateText, setPrivateText] = useState<string>('');
  const updatePrivateText = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrivateText(e.target.value);
  };

  // Room Store
  const joinRoomMembership = useRoomStore((state) => state.joinRoomMembership);

  // Checks if the user entered pin matches the board pin
  const compareKey = async () => {
    if (!privateText) return;
    // Feature of UUID v5: private key to 'sign' a string
    // Hash the PIN: the namespace comes from the server configuration
    const key = uuidv5(privateText, config.namespace);

    // compare the hashed keys
    if (key === props.room.data.privatePin) {
      joinRoomMembership(props.room._id);
      toast({
        title: `You have successfully joined ${props.room.data.name}`,
        status: 'success',
        duration: 4 * 1000,
        isClosable: true,
      });
      handleOnClose();
    } else {
      toast({
        title: `The password you have entered is incorrect`,
        status: 'error',
        duration: 4 * 1000,
        isClosable: true,
      });
      setPrivateText('');
    }
  };

  // Allows the user to hit enter to submit the password
  const handleKeyClick = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      compareKey();
    }
  };

  // Clear the password on close
  const handleOnClose = () => {
    setPrivateText('');
    props.onClose();
  };

  return (
    <Modal isCentered initialFocusRef={initialRef} size="lg" isOpen={props.isOpen} onClose={handleOnClose} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{props.room.data.name} is Password Protected</ModalHeader>
        <ModalBody>
          <InputGroup>
            <InputLeftAddon children="Password" />
            <Input
              onKeyDown={handleKeyClick}
              ref={initialRef}
              width="full"
              value={privateText}
              type="password"
              autoComplete="off"
              autoCapitalize="off"
              onChange={updatePrivateText}
            />
          </InputGroup>
          <ModalFooter pr="0">
            <Button colorScheme="blue" mr="4" onClick={props.onClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={compareKey}>
              Enter
            </Button>
          </ModalFooter>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

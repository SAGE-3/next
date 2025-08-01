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
import { Room, User } from '@sage3/shared/types';

// Props for the AboutModal
interface RoomSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
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

  // Room Search Filter that matches on name only
  const searchRooms = (room: Room) => {
    return room.data.name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase());
  };

  const onClose = () => {
    setSearchTerm('');
    props.onClose();
  };

  return (
    <Modal isOpen={props.isOpen} onClose={onClose} isCentered size="xl">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent 
        bg={useColorModeValue('white', 'gray.800')}
        borderRadius="xl"
        boxShadow="xl"
        border="1px solid"
        borderColor={useColorModeValue('gray.200', 'gray.700')}
      >
        <ModalHeader 
          fontSize="2xl" 
          fontWeight="bold"
          borderBottom="1px solid"
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          pb={4}
        >
          Search Rooms
        </ModalHeader>
        <ModalBody px={6} py={6}>
          <InputGroup mb={6}>
            <InputLeftElement pointerEvents="none">
              <MdSearch color={useColorModeValue('gray.400', 'gray.500')} />
            </InputLeftElement>
            <Input
              ref={initialRef}
              type="text"
              _placeholder={{ color: searchColor }}
              placeholder="Type to search for rooms..."
              onChange={handleSearchTermChange}
              size="lg"
              borderRadius="lg"
              border="2px solid"
              borderColor={useColorModeValue('gray.200', 'gray.600')}
              _focus={{
                borderColor: useColorModeValue('teal.400', 'teal.300'),
                boxShadow: `0 0 0 1px ${useColorModeValue('teal.400', 'teal.300')}`,
              }}
              _hover={{
                borderColor: useColorModeValue('gray.300', 'gray.500'),
              }}
            />
          </InputGroup>
          
          {searchTerm.length === 0 ? (
            <Box
              display="flex"
              flexDir="column"
              alignItems="center"
              justifyContent="center"
              height="40vh"
              color={useColorModeValue('gray.500', 'gray.400')}
            >
              <MdSearch size={48} />
              <Box mt={4} fontSize="lg" fontWeight="medium">
                Start typing to search for rooms
              </Box>
              <Box mt={2} fontSize="sm" textAlign="center">
                Search by room name
              </Box>
            </Box>
          ) : (
            <Box
              display="flex"
              flexDir="column"
              textAlign="left"
              gap="3"
              height="40vh"
              overflowY="auto"
              pr="2"
              pt="2"
              css={{
                '&::-webkit-scrollbar': {
                  background: 'transparent',
                  width: '6px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: scrollBarColor,
                  borderRadius: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
              }}
            >
              {rooms
                .filter((room: Room) => room.data.isListed || (!room.data.isListed && room.data.ownerId === user?._id))
                .filter(searchRooms)
                .sort((a, b) => a.data.name.localeCompare(b.data.name))
                              .map((room) => (
                <RoomRow key={room._id} room={room} users={props.users} />
              ))}
              {rooms
                .filter((room: Room) => room.data.isListed || (!room.data.isListed && room.data.ownerId === user?._id))
                .filter(searchRooms)
                .length === 0 && (
                <Box
                  display="flex"
                  flexDir="column"
                  alignItems="center"
                  justifyContent="center"
                  height="40vh"
                  color={useColorModeValue('gray.500', 'gray.400')}
                >
                  <MdSearch size={32} />
                  <Box mt={3} fontSize="md" fontWeight="medium">
                    No rooms found
                  </Box>
                  <Box mt={1} fontSize="sm" textAlign="center">
                    Try adjusting your search terms
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </ModalBody>
        <ModalFooter 
          borderTop="1px solid"
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          pt={4}
        >
          <Button 
            onClick={onClose}
            colorScheme="teal"
            size="md"
            px={6}
          >
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

interface RoomRowProps {
  room: Room;
  users: User[];
}

function RoomRow(props: RoomRowProps) {
  const { user } = useUser();
  const userId = user ? user._id : '';

  // Colors
  const borderColorValue = useColorModeValue(props.room.data.color, props.room.data.color);
  const borderColor = useHexColor(borderColorValue);

  // Get owner name
  const owner = props.users.find(u => u._id === props.room.data.ownerId);
  const ownerName = owner ? owner.data.name : 'Unknown User';

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
        background={useColorModeValue('white', 'gray.700')}
        p="4"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        borderRadius="lg"
        boxSizing="border-box"
        border="1px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
        borderLeft={`4px solid ${borderColor}`}
        transition="all 0.2s ease-in-out"
        _hover={{
          transform: 'translateY(-1px)',
          boxShadow: useColorModeValue('lg', 'dark-lg'),
          borderColor: useColorModeValue('gray.300', 'gray.500'),
        }}
        cursor="pointer"
      >
        <Box display="flex" flexDir="column" flex="1" minW="0">
          <Box 
            overflow="hidden" 
            textOverflow="ellipsis" 
            whiteSpace="nowrap" 
            fontSize="lg" 
            fontWeight="bold"
            color={useColorModeValue('gray.800', 'white')}
            mb="1"
          >
            {props.room.data.name}
          </Box>
          <Box 
            overflow="hidden" 
            textOverflow="ellipsis" 
            whiteSpace="nowrap" 
            fontSize="sm"
            color={useColorModeValue('gray.600', 'gray.300')}
          >
            Owner: {ownerName}
          </Box>
        </Box>
        <Box display="flex" alignItems="center" ml="4">
          {isOwner || isMember ? (
            <Tag 
              size="md" 
              px="3"
              py="1"
              colorScheme={isOwner ? 'green' : 'yellow'} 
              borderRadius="full"
              fontWeight="medium"
            >
              {isOwner ? 'Owner' : 'Member'}
            </Tag>
          ) : (
            <Button
              size="sm"
              variant="solid"
              px="4"
              py="2"
              fontSize="sm"
              fontWeight="medium"
              aria-label="join-room"
              colorScheme="teal"
              onClick={handleMembershipClick}
              borderRadius="lg"
              _hover={{
                transform: 'scale(1.05)',
              }}
              transition="all 0.2s"
            >
              <Box mr="1">Join</Box>
              {isPasswordProtected && <MdLock size={14} />}
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
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent
        bg={useColorModeValue('white', 'gray.800')}
        borderRadius="xl"
        boxShadow="xl"
        border="1px solid"
        borderColor={useColorModeValue('gray.200', 'gray.700')}
      >
        <ModalHeader 
          fontSize="xl" 
          fontWeight="bold"
          borderBottom="1px solid"
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          pb={4}
        >
          <Box display="flex" alignItems="center" gap={3}>
            <MdLock size={20} />
            {props.room.data.name} is Password Protected
          </Box>
        </ModalHeader>
        <ModalBody py={6}>
          <Box mb={4} color={useColorModeValue('gray.600', 'gray.300')} fontSize="sm">
            Enter the password to join this room
          </Box>
          <InputGroup>
            <InputLeftAddon 
              children="Password" 
              bg={useColorModeValue('gray.100', 'gray.600')}
              borderColor={useColorModeValue('gray.200', 'gray.600')}
            />
            <Input
              onKeyDown={handleKeyClick}
              ref={initialRef}
              width="full"
              value={privateText}
              type="password"
              autoComplete="off"
              autoCapitalize="off"
              onChange={updatePrivateText}
              borderRadius="0 lg lg 0"
              borderColor={useColorModeValue('gray.200', 'gray.600')}
              _focus={{
                borderColor: useColorModeValue('teal.400', 'teal.300'),
                boxShadow: `0 0 0 1px ${useColorModeValue('teal.400', 'teal.300')}`,
              }}
            />
          </InputGroup>
        </ModalBody>
        <ModalFooter 
          borderTop="1px solid"
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          pt={4}
        >
          <Button 
            colorScheme="gray" 
            mr={3} 
            onClick={props.onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <Button 
            colorScheme="teal" 
            onClick={compareKey}
            isDisabled={!privateText.trim()}
          >
            Join Room
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

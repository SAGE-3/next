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
  ModalCloseButton,
  Input,
  Box,
  Text,
  Divider,
  Tooltip,
  useDisclosure,
  useColorModeValue,
  useToast,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { MdSearch } from 'react-icons/md';

import { Board, User } from '@sage3/shared/types';
import { EnterBoardModal, useHexColor, usePresenceStore, useUser, useUsersStore } from '@sage3/frontend';

// User Search Modal Props
interface UserSearchProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * User Search Modal to allow users to find other users within the SAGE3 server.
 * @param props
 * @returns
 */
export function UserSearchModal(props: UserSearchProps): JSX.Element {
  // Users & Presences
  const { user } = useUser();
  const users = useUsersStore((state) => state.users);
  const presences = usePresenceStore((state) => state.presences);

  // Local search results
  const [userResults, setUserResults] = useState<User[]>([]);

  // Search prompt and change handler
  const [searchPrompt, setSearchPrompt] = useState<string>('');
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchPrompt(event.target.value);
  };

  // Element to set the focus to when opening the dialog
  const initialRef = useRef<HTMLInputElement>(null);

  // Sort the users by presence and name. Remove current user.
  const sortAndFilterUsers = () => {
    // Sort by name
    users.sort((a, b) => a.data.name.localeCompare(b.data.name));
    // Remove current user, guest, and offline users
    return users.filter((u) => u._id !== user?._id && u.data.userRole !== 'guest' && presences.find((p) => p._id === u._id));
  };

  // Perform the user search and set the results
  const performUserSearch = async (searchPrompt: string) => {
    // Remove extra spaces
    const term = searchPrompt.trim();
    // Search for users
    if (term.length > 0) {
      const sortedUsers = sortAndFilterUsers();
      const results = sortedUsers.filter(
        (user) =>
          user.data.name.toLowerCase().includes(term.toLowerCase()) ||
          user.data.email.toLowerCase().includes(term.toLowerCase())
      );
      setUserResults(results);
    } else {
      setUserResults([]);
    }
  };

  // Perform search when users change and search prompt changes

  useEffect(() => {
    performUserSearch(searchPrompt);
  }, [searchPrompt, users, presences]);

  // Close the modal
  const closeModal = () => {
    props.onClose();
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} isCentered size={'xl'} initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent pb={3}>
        <ModalHeader>User Search</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {/* User serarch input */}
          <Box px="2">
            <InputGroup>
              <InputLeftElement pointerEvents="none" children={<MdSearch color="gray.300" />} />
              <Input
                placeholder="Search for a user"
                _placeholder={{ color: 'gray.400', opacity: 1.0 }}
                onChange={handleSearchChange}
                value={searchPrompt}
                ref={initialRef}
              />
            </InputGroup>
          </Box>
          {/* Divider */}
          <Box px="3" my="3">
            <Divider></Divider>
          </Box>
          {/* User Results */}
          <Box display="flex" flexDir="column" height="50vh" width="100%" overflowY="auto" overflowX="hidden" p="3">
            {userResults.map((user) => (
              <UserCard key={user._id} user={user} onClose={closeModal} />
            ))}
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

/**
 * User Card Props
 */
type UserCardProps = {
  user: User;
  onClose: () => void;
};

/**
 * Displays the user's name, email, and current board if they are in one.
 */
function UserCard(props: UserCardProps) {
  // Status colors
  const onlineColor = useHexColor('green');
  // const awayColor = useHexColor('yellow');
  const offlineColor = useHexColor('red');

  // Card Background colors
  const background = useColorModeValue('#f5f5f5', 'gray.600');
  const hoverBackground = useColorModeValue('#fffefe', 'gray.500');

  // Current Presences
  const presences = usePresenceStore((state) => state.presences);
  const presence = presences.find((presence) => presence._id === props.user._id);

  // Display information
  const name = props.user.data.name;
  const email = props.user.data.email ? props.user.data.email : 'Guest';

  // Modal control
  const { isOpen: enterBoardIsOpen, onOpen: enterBoardOnOpen, onClose: enterBoardOnClose } = useDisclosure();

  // Board information for the user
  const [board, setBoard] = useState<Board | undefined>(undefined);

  // Toast for information feedback
  const toast = useToast();

  // Get the board information for the user
  async function getBoardInfo(boardId: string) {
    const res = await fetch(`/api/boards/${boardId}`);
    const data = await res.json();
    if (data.success) {
      setBoard(data.data[0]);
    }
    return;
  }

  // User effect to obtain the board information at start
  // Then update information if presence changes
  useEffect(() => {
    if (presence && presence.data.boardId) {
      getBoardInfo(presence.data.boardId);
    }
  }, [JSON.stringify(presence)]);

  // Close the modal
  const closeModal = () => {
    props.onClose();
    enterBoardOnClose();
  };

  // Attempt to enter the board
  const enterBoard = () => {
    if (board) {
      enterBoardOnOpen();
    } else {
      // Chakra toast
      toast({ title: `${props.user.data.name} is not currently part of any board.`, status: 'info', duration: 3000, isClosable: true });
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignContent="center"
      mb="2"
      border="solid 2px"
      borderColor="gray.400"
      backgroundColor={background}
      p="1"
      px="3"
      borderRadius="md"
      onClick={enterBoard}
      cursor="pointer"
      transition="all 0.1s ease-in-out"
      _hover={{ backgroundColor: hoverBackground, transform: 'scale(1.05)' }}
    >
      {/* Board Modal */}
      {board && <EnterBoardModal board={board} isOpen={enterBoardIsOpen} onClose={closeModal} />}

      {/* Left side of display card */}
      <Box display="flex" justifyContent="left" alignContent="center" width="50%">
        {/* Status Icon */}
        <Box>
          <Tooltip label={presence ? 'User is online' : 'User is offline'} aria-label="online-status" hasArrow placement="top">
            <Box
              borderRadius="100%"
              backgroundColor={presence ? onlineColor : offlineColor}
              width="28px"
              height="28px"
              transform="translateY(8px)"
            ></Box>
          </Tooltip>
        </Box>

        {/* Name and Email information */}
        <Box display="flex" flexDir="column" ml="2" whiteSpace="nowrap" overflow="hidden">
          <Text fontSize="md" fontWeight="bold" textOverflow="ellipsis">
            {name}
          </Text>
          <Text fontSize="sm">{email}</Text>
        </Box>
      </Box>

      {/* Right side of display card */}
      <Box display="flex" justifyContent="right">
        {/* Board information */}
        <Box display="flex" flexDir="column" ml="2" whiteSpace="nowrap" overflow="hidden" textAlign="right">
          <Text fontSize="md" textOverflow="ellipsis">
            Board
          </Text>
          <Text fontSize="sm">{board ? board.data.name : 'Not on a board'}</Text>
        </Box>
      </Box>
    </Box>
  );
}

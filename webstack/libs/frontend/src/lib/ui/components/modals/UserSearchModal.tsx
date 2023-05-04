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
  ModalFooter,
  ModalBody,
  Button,
  ModalCloseButton,
  Input,
  Avatar,
  Box,
  Text,
  Divider,
  Tooltip,
  useDisclosure,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';

import { SAGEColors } from '@sage3/shared';
import { Board, Presence, User } from '@sage3/shared/types';
import { APIHttp, EnterBoardModal, useHexColor, usePresenceStore, useUsersStore } from '@sage3/frontend';

interface UserSearchProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Confirmation Modal
 * @param props
 * @returns
 */
export function UserSearchModal(props: UserSearchProps): JSX.Element {
  // Users & Presences
  const users = useUsersStore((state) => state.users);
  const presences = usePresenceStore((state) => state.presences);
  // Local search results
  const [userResults, setUserResults] = useState<User[]>([]);
  const [searchPrompt, setSearchPrompt] = useState<string>('');
  // Element to set the focus to when opening the dialog
  const initialRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchPrompt(event.target.value);
  };

  const performUserSearch = async (searchPrompt: string) => {
    // Search for users
    if (searchPrompt.length > 0) {
      const results = users.filter((user) =>
        user.data.name.toLowerCase().includes(searchPrompt.toLowerCase()) ||
        user.data.email.toLowerCase().includes(searchPrompt.toLowerCase())
      );
      setUserResults(results);
    } else {
      setUserResults(users);
    }
  };

  // Perform search when users change and search prompt changes
  useEffect(() => {
    // sort by name
    users.sort((a, b) => a.data.name.localeCompare(b.data.name));
    // sort by presence
    users.sort((a, b) => {
      const pa = presences.find((p) => p._id === a._id);
      const pb = presences.find((p) => p._id === b._id);
      if (pa && pb) return 0;
      if (pa) return -1;
      return 1;
    });
    performUserSearch(searchPrompt);
  }, [searchPrompt, users, presences]);

  const closeModal = () => {
    props.onClose();
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} isCentered size={"xl"} initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>User Search</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box px="2">
            <Input ref={initialRef} placeholder="Search for a user" _placeholder={{ color: 'gray.400', opacity: 1.0 }} onChange={handleSearchChange} />
          </Box>

          <Box px="3" mt="3">
            <Divider></Divider>
          </Box>
          <Box display="flex" flexDir="column" height="50vh" width="100%" overflowY="auto" overflowX="hidden" p="3">
            {userResults.map((user) => (
              <UserCard key={user._id} user={user} onClose={closeModal} />
            ))}
          </Box>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme={'gray'} mr={3} onClick={props.onClose}>
            Close{' '}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

type UserCardProps = {
  user: User;
  onClose: () => void;
};
function UserCard(props: UserCardProps) {
  const green = useHexColor('green');
  const red = useHexColor('red');
  const background = useColorModeValue('#f5f5f5', 'gray.600');
  const hoverBackground = useColorModeValue('#fffefe', 'gray.500');
  // Current Presences
  const presences = usePresenceStore((state) => state.presences);
  const presence = presences.find((presence) => presence._id === props.user._id);

  const name = props.user.data.name;
  const email = props.user.data.email ? props.user.data.email : 'Guest';

  const { isOpen: enterBoardIsOpen, onOpen: enterBoardOnOpen, onClose: enterBoardOnClose } = useDisclosure();

  const [board, setBoard] = useState<Board | undefined>(undefined);

  const toast = useToast();

  async function getBoardInfo(boardId: string) {
    const res = await fetch(`/api/boards/${boardId}`);
    const data = await res.json();
    if (data.success) {
      setBoard(data.data[0]);
    }
    return;
  }

  useEffect(() => {
    if (presence && presence.data.boardId) {
      getBoardInfo(presence.data.boardId);
    }
  }, [JSON.stringify(presence)]);

  const closeModal = () => {
    props.onClose();
    enterBoardOnClose();
  };

  const enterBoard = () => {
    if (board) {
      enterBoardOnOpen();
    } else {
      // Chakra toast
      toast({ title: `${props.user.data.name} is not currently within in a board.`, status: 'info', duration: 3000, isClosable: true });
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
      {board && <EnterBoardModal board={board} isOpen={enterBoardIsOpen} onClose={closeModal} />}
      <Box display="flex" justifyContent="left" alignContent="center" width="50%">
        <Box>
          <Tooltip label={presence ? 'User is online' : 'User is offline'} aria-label="online-status" hasArrow placement="top">
            <Box borderRadius="100%" backgroundColor={presence ? green : red} width="28px" height="28px" transform="translateY(8px)"></Box>
          </Tooltip>
        </Box>
        <Box display="flex" flexDir="column" ml="2" whiteSpace="nowrap" overflow="hidden">
          <Text fontSize="md" fontWeight="bold" textOverflow="ellipsis">
            {name}
          </Text>
          <Text fontSize="sm">{email}</Text>
        </Box>
      </Box>
      <Box display="flex" justifyContent="right">
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

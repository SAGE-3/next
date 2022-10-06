/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { ChangeEvent, useEffect, useState } from 'react';
import { Box, Input, InputGroup, InputRightElement, Select, Textarea, useColorModeValue, useToast } from '@chakra-ui/react';

import { User } from '@sage3/shared/types';
import { usePresenceStore, useRoomStore, useUsersStore } from '@sage3/frontend';
import { useUser, useAuth } from '@sage3/frontend';
import { MdSearch } from 'react-icons/md';

type ChatListProps = {};

export function ChatList(props: ChatListProps) {
  // Me
  const { user } = useUser();
  const { auth } = useAuth();

  // Data stores
  const users = useUsersStore((state) => state.users);
  const presences = usePresenceStore((state) => state.presences);
  const storeError = useRoomStore((state) => state.error);
  const clearError = useRoomStore((state) => state.clearError);
  const deleteRoom = useRoomStore((state) => state.delete);
  const subToAllRooms = useRoomStore((state) => state.subscribeToAllRooms);

  // UI elements
  const borderColor = useColorModeValue('#718096', '#A0AEC0');
  const toast = useToast();
  const [filteredUsers, setFilteredUsers] = useState<User[] | null>(null);
  const [search, setSearch] = useState('');

  const [sortBy, setSortBy] = useState<'Name' | 'Updated' | 'Created'>('Name');

  function sortByName(a: User, b: User) {
    return b.data.name.localeCompare(a.data.name);
  }

  function sortByUpdated(a: User, b: User) {
    return a._updatedAt < b._updatedAt ? -1 : 1;
  }

  function sortByCreated(a: User, b: User) {
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

  useEffect(() => {
    subToAllRooms();
  }, [subToAllRooms]);

  // Filter boards with the search string
  function handleFilterUsers(event: any) {
    setSearch(event.target.value);
    const filBoards = users.filter((room) => room.data.name.toLowerCase().includes(event.target.value.toLowerCase()));
    setFilteredUsers(filBoards);
    if (event.target.value === '') {
      setFilteredUsers(null);
    }
  }

  return (
    <>
      <Box
        overflowY="auto"
        pr="2"
        mb="2"
        css={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'teal',
            borderRadius: 'md',
          },
        }}
      >
        <Box width="100%" textAlign={'right'}>
          Chat Chat
        </Box>
        <Box width="100%">Chat Chat</Box>
        <Box width="100%" textAlign={'right'}>
          Chat Chat
        </Box>
        <Box width="100%">Chat Chat</Box>
      </Box>
      <Box
        height="60px"
        border="solid gray 2px"
        borderRadius="md"
        background="gray.700"
        display="flex"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
      >
        Selected User
      </Box>

      <Textarea placeholder="Here is a sample placeholder" my="2" height="88px" resize={'none'} />
    </>
  );
}

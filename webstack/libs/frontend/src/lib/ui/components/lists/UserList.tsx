/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ChangeEvent, useEffect, useState } from 'react';
import { Box, Input, InputGroup, InputRightElement, Select, useToast } from '@chakra-ui/react';
import { MdSearch } from 'react-icons/md';

import { User } from '@sage3/shared/types';
import { UserCard, useRoomStore, useUsersStore } from '@sage3/frontend';

type UserListProps = {
  onUserClick: (user: User) => void;
  selectedUser: User | undefined;
};

export function UserList(props: UserListProps) {
  // Data stores
  const users = useUsersStore((state) => state.users);
  const storeError = useRoomStore((state) => state.error);
  const clearError = useRoomStore((state) => state.clearError);
  const subToAllRooms = useRoomStore((state) => state.subscribeToAllRooms);

  // UI elements
  const toast = useToast();
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
  function handleFilterUsers(event: ChangeEvent<HTMLInputElement>) {
    // setSearch(event.target.value);
    // const filBoards = users.filter((room) => room.data.name.toLowerCase().includes(event.target.value.toLowerCase()));
    // setFilteredUsers(filBoards);
    // if (event.target.value === '') {
    //   setFilteredUsers(null);
    // }
  }

  return (
    <>
      <Box overflowY="auto" pr="2" mb="2"
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
            borderRadius: '8px',
          },
        }}
      >
        {users
          // show only public rooms or mine
          // .filter((user) => user._id !== user?._id)
          .sort(sortFunction)
          .map((u) => {
            return <UserCard user={u} key={u._id} onClick={() => console.log(u)} selected={true} />;
          })}
      </Box>
      <InputGroup>
        <Select mt="2" onChange={handleSortChange}>
          <option value="Name"> Name</option>
          <option value="Updated">Updated</option>
          <option value="Created">Created</option>
        </Select>
      </InputGroup>
      <InputGroup>
        <Input my="2" value={search}
          onChange={handleFilterUsers}
          placeholder="Search Users..."
          _placeholder={{ opacity: 1, color: 'gray.600' }}
        />
        <InputRightElement pointerEvents="none" transform={`translateY(8px)`} fontSize="1.4em" children={<MdSearch />} />
      </InputGroup>
    </>
  );
}

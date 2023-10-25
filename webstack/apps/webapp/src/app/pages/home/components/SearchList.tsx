/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, Icon, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { useHexColor, useRoomStore, useUsersStore, useBoardStore } from '@sage3/frontend';
import { Board, Room, User } from '@sage3/shared/types';
import { MdAdd, MdApps, MdExitToApp, MdFolder, MdGroup, MdHouse, MdJoinFull, MdPerson, MdSquare, MdStarOutline } from 'react-icons/md';

type SearchListProps = {
  searchInput: string;
  searchDiv: HTMLDivElement | null;
};

export function SearchList(props: SearchListProps) {
  if (!props.searchDiv) return null;

  // Get input width
  const inputWidth = props.searchDiv.getBoundingClientRect().width;

  // Search
  const searchValue = props.searchInput.toLocaleLowerCase();

  // Searchable Items
  const { users } = useUsersStore((state) => state);
  const { boards } = useBoardStore((state) => state);
  const { rooms } = useRoomStore((state) => state);

  // Filters
  const boardsFilter = (board: Board): boolean => {
    const nameCheck = board.data.name.toLocaleLowerCase().includes(searchValue);
    const descriptionCheck = board.data.description.toLocaleLowerCase().toLocaleLowerCase().includes(searchValue);
    return nameCheck || descriptionCheck;
  };
  const usersFilter = (user: User): boolean => {
    const nameCheck = user.data.name.toLocaleLowerCase().includes(searchValue);
    const emailCheck = user.data.email.toLocaleLowerCase().includes(searchValue);
    return nameCheck || emailCheck;
  };
  const roomsFilter = (room: Room): boolean => {
    const nameCheck = room.data.name.toLocaleLowerCase().includes(searchValue);
    const descriptionCheck = room.data.description.toLocaleLowerCase().includes(searchValue);
    return nameCheck || descriptionCheck;
  };

  // Colors
  const borderColor = useHexColor('teal');
  const backgroundColor = useColorModeValue('gray.50', 'gray.800');
  return (
    <Box
      height="40vh"
      position="absolute"
      backgroundColor={backgroundColor}
      padding="20px"
      borderRadius="md"
      width={inputWidth + 'px'}
      zIndex="100"
      marginTop="4px"
      border={`solid 2px ${borderColor}`}
      overflowY="scroll"
    >
      {boards.filter(boardsFilter).map((b) => {
        return (
          <Box
            width="100%"
            my="1"
            borderRadius="3px"
            p="1"
            display="flex"
            justifyContent={'space-between'}
            cursor="pointer"
            _hover={{ backgroundColor: 'gray' }}
          >
            <Box>
              <Icon fontSize="2xl" mr="2">
                <MdApps />
              </Icon>
              {b.data.name}
            </Box>
            <Box alignItems={'left'}> </Box>
            <Box>
              <Icon fontSize="2xl" mr="2">
                <MdStarOutline />
              </Icon>
              <Icon fontSize="2xl" mr="2">
                <MdExitToApp />
              </Icon>
            </Box>
          </Box>
        );
      })}
      {rooms.filter(roomsFilter).map((b) => {
        return (
          <Box
            width="100%"
            my="1"
            borderRadius="3px"
            p="1"
            display="flex"
            justifyContent={'space-between'}
            cursor="pointer"
            _hover={{ backgroundColor: 'gray' }}
          >
            <Box>
              <Icon fontSize="2xl" mr="2">
                <MdFolder />
              </Icon>
              {b.data.name}
            </Box>
            <Box alignItems={'left'}> </Box>
            <Box>
              <Icon fontSize="2xl" mr="2">
                <MdStarOutline />
              </Icon>
              <Icon fontSize="2xl" mr="2">
                <MdAdd />
              </Icon>
            </Box>
          </Box>
        );
      })}
      {users.filter(usersFilter).map((b) => {
        return (
          <Box
            width="100%"
            my="1"
            borderRadius="3px"
            p="1"
            display="flex"
            justifyContent={'space-between'}
            cursor="pointer"
            _hover={{ backgroundColor: 'gray' }}
          >
            <Box>
              <Icon fontSize="2xl" mr="2">
                <MdPerson />
              </Icon>
              {b.data.name}
            </Box>
            <Box alignItems={'left'}> </Box>
            <Box>
              <Icon fontSize="2xl" mr="2">
                <MdStarOutline />
              </Icon>
              <Icon fontSize="2xl" mr="2">
                <MdExitToApp />
              </Icon>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

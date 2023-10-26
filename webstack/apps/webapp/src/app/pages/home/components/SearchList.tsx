/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, Icon, useColorModeValue, Text, Divider, IconButton } from '@chakra-ui/react';
import { useHexColor, useRoomStore, useUsersStore, useBoardStore, useUser } from '@sage3/frontend';
import { Board, Room, User } from '@sage3/shared/types';
import { MdApps, MdFolder, MdPerson, MdStar, MdStarOutline } from 'react-icons/md';

type SearchListProps = {
  searchInput: string;
  searchDiv: HTMLDivElement | null;
  setSearch: (search: string) => void;
  onRoomClick: (room: Room) => void;
  onBoardClick: (board: Board) => void;
  onUserClick: (user: User) => void;
};

export function SearchList(props: SearchListProps) {
  if (!props.searchDiv) return null;

  const { user, saveBoard, removeBoard, saveRoom, removeRoom, saveUser, removeUser } = useUser();

  // Saved Info
  const savedBoards = user && user.data.savedBoards ? user.data.savedBoards : [];
  const savedRooms = user && user.data.savedRooms ? user.data.savedRooms : [];
  const savedUsers = user && user.data.savedUsers ? user.data.savedUsers : [];

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
  const hoverBackgroundColor = useColorModeValue('gray.100', 'gray.700');
  const hoverColor = useHexColor(hoverBackgroundColor);

  // Interaction
  const handleRoomClick = (room: Room) => {
    props.onRoomClick(room);
    props.setSearch('');
  };
  const handleBoardClick = (board: Board) => {
    props.onBoardClick(board);
    props.setSearch('');
  };
  const handleUserClick = (user: User) => {
    props.onUserClick(user);
    props.setSearch('');
  };

  // Favorites Events
  const handleBoardFavorite = (event: any, board: Board) => {
    event.preventDefault();
    event.stopPropagation();
    const boardId = board._id;
    if (user && removeBoard && saveBoard) {
      savedBoards.includes(boardId) ? removeBoard(boardId) : saveBoard(boardId);
    }
  };
  const handleRoomFavorite = (event: any, room: Room) => {
    event.preventDefault();
    event.stopPropagation();
    const roomId = room._id;
    if (user && removeRoom && saveRoom) {
      savedRooms.includes(roomId) ? removeRoom(roomId) : saveRoom(roomId);
    }
  };
  const handleUserFavorite = (event: any, user: User) => {
    event.preventDefault();
    event.stopPropagation();
    const userId = user._id;
    if (user && removeUser && saveUser) {
      savedUsers.includes(userId) ? removeUser(userId) : saveUser(userId);
    }
  };

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
      <Text fontSize="xl">Rooms</Text>
      <Divider />
      {rooms.filter(roomsFilter).map((room) => {
        return (
          <Box
            width="100%"
            my="1"
            borderRadius="3px"
            p="1"
            display="flex"
            justifyContent={'space-between'}
            alignItems={'center'}
            cursor="pointer"
            _hover={{ backgroundColor: hoverColor }}
            onClick={() => handleRoomClick(room)}
          >
            <Box>
              <Icon fontSize="2xl" mr="2">
                <MdFolder />
              </Icon>
              {room.data.name}
            </Box>
            <Box alignItems={'left'}> </Box>
            <Box>
              <IconButton
                size="sm"
                fontSize="xl"
                mr="2"
                icon={savedRooms.includes(room._id) ? <MdStar /> : <MdStarOutline />}
                aria-label={'favorite-board'}
                onClick={(event) => handleRoomFavorite(event, room)}
              ></IconButton>
            </Box>
          </Box>
        );
      })}
      <Text fontSize="xl">Boards</Text>
      <Divider />
      {boards.filter(boardsFilter).map((board) => {
        return (
          <Box
            width="100%"
            my="1"
            borderRadius="3px"
            p="1"
            display="flex"
            justifyContent={'space-between'}
            alignItems={'center'}
            cursor="pointer"
            _hover={{ backgroundColor: hoverColor }}
            onClick={() => handleBoardClick(board)}
          >
            <Box>
              <Icon fontSize="2xl" mr="2">
                <MdApps />
              </Icon>
              {board.data.name}
            </Box>
            <Box alignItems={'left'}> </Box>
            <Box>
              <IconButton
                size="sm"
                fontSize="xl"
                mr="2"
                icon={savedBoards.includes(board._id) ? <MdStar /> : <MdStarOutline />}
                aria-label={'favorite-board'}
                onClick={(event) => handleBoardFavorite(event, board)}
              ></IconButton>
            </Box>
          </Box>
        );
      })}
      <Text fontSize="xl">Users</Text>
      <Divider />
      {users.filter(usersFilter).map((user) => {
        return (
          <Box
            width="100%"
            my="1"
            borderRadius="3px"
            p="1"
            display="flex"
            justifyContent={'space-between'}
            alignItems={'center'}
            cursor="pointer"
            _hover={{ backgroundColor: hoverColor }}
            onClick={() => handleUserClick(user)}
          >
            <Box>
              <Icon fontSize="2xl" mr="2">
                <MdPerson />
              </Icon>
              {user.data.name}
            </Box>
            <Box alignItems={'left'}> </Box>
            <Box>
              <IconButton
                size="sm"
                fontSize="xl"
                mr="2"
                icon={savedUsers.includes(user._id) ? <MdStar /> : <MdStarOutline />}
                aria-label={'favorite-board'}
                onClick={(event) => handleUserFavorite(event, user)}
              ></IconButton>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

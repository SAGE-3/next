/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Box, useColorModeValue, Text, Image, Progress, IconButton, Input, InputLeftElement, InputGroup } from '@chakra-ui/react';

import { UserRow, BoardRow, RoomRow, RoomCard, BoardCard, UserCard } from './components';

import {
  JoinBoardCheck,
  useBoardStore,
  usePresenceStore,
  useRoomStore,
  useUsersStore,
  MainButton,
  useUser,
  Clock,
  usePluginStore,
  useConfigStore,
  useRouteNav,
  useHexColor,
} from '@sage3/frontend';
import { Board, Presence, Room, User } from '@sage3/shared/types';
import { MdAdd, MdEdit, MdLink, MdManageAccounts, MdSearch, MdStar, MdStarOutline } from 'react-icons/md';
import { set } from 'date-fns';

type UserPresence = {
  user: User;
  presence: Presence | undefined;
};

export function HomePage() {
  // URL Params
  const { roomId } = useParams();
  const { toHome } = useRouteNav();

  // Configuration information
  const config = useConfigStore((state) => state.config);

  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // Plugin Store
  const subPlugins = usePluginStore((state) => state.subscribeToPlugins);

  // Room Store
  const [selectedRoomId] = useState<string | undefined>(roomId);
  const { rooms, subscribeToAllRooms: subscribeToRooms, fetched: roomsFetched } = useRoomStore((state) => state);

  // Board Store
  const { boards, subscribeToAllBoards: subscribeToBoards } = useBoardStore((state) => state);

  // User Selected Room and Board
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);

  // User
  const { user } = useUser();
  const savedRooms = user?.data.savedRooms || [];
  const savedBoards = user?.data.savedBoards || [];
  const savedUsers = user?.data.savedUsers || [];

  // User and Presence Store
  const { users, subscribeToUsers } = useUsersStore((state) => state);
  const { update: updatePresence, subscribe: subscribeToPresence, presences } = usePresenceStore((state) => state);

  // Handle Search Input
  const [searchInput, setSearchInput] = useState<string>('');
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };
  const inputBorderColor = useHexColor('teal.200');

  // Filter Functions
  const roomsFilter = (room: Room): boolean => {
    if (searchInput.length > 0) {
      // If the user is searching, filter rooms by searchInput
      return room.data.name.toLowerCase().includes(searchInput.toLowerCase());
    } else {
      // If the user is not searching, return favroties
      return savedRooms.includes(room._id);
    }
  };
  const boardsFilter = (board: Board): boolean => {
    // If showFavorites is true, filter boards by savedBoards
    if (searchInput.length > 0) {
      // If the user is searching, filter boards by searchInput
      return board.data.name.toLowerCase().includes(searchInput.toLowerCase());
    } else if (selectedRoom) {
      // If the user is not searching or showing favorites, filter boards by selectedRoom
      return board.data.roomId === selectedRoom._id;
    } else {
      // If the user is not searching  or selected a room, return favorites
      return savedBoards.includes(board._id);
    }
  };
  const concatUserPresence = (userList: User[]): UserPresence[] => {
    return userList.map((u) => {
      return { user: u, presence: presences.find((p) => p._id === u._id) };
    });
  };
  const usersFilter = (): UserPresence[] => {
    if (searchInput.length > 0) {
      // If the user is searching, filter users by searchInput
      const searchedUsers = users.filter((user) => user.data.name.toLowerCase().includes(searchInput.toLowerCase()));
      return concatUserPresence(searchedUsers);
    } else if (selectedBoard) {
      // If the user is not searching or showing favorites, filter users by selectedBoard
      const boardPresence = presences.filter((presence) => presence.data.boardId === selectedBoard._id);
      const boardUsers = users.filter((user) => boardPresence.find((presence) => presence._id === user._id));
      return concatUserPresence(boardUsers);
    } else if (selectedRoom) {
      // If the user is not search or showing favorites or selected a board, filter users by selectedRoom
      const roomPresence = presences.filter((presence) => presence.data.roomId === selectedRoom._id);
      const roomUsers = users.filter((user) => roomPresence.find((presence) => presence._id === user._id));
      return concatUserPresence(roomUsers);
    } else {
      // If the user is not searching  or selected a room or board, return favorites
      const favUsers = users.filter((user) => savedUsers.includes(user._id));
      return concatUserPresence(favUsers);
    }
  };

  // Subscribe to user updates
  useEffect(() => {
    // Update the document title
    document.title = 'SAGE3 - Home';

    subscribeToPresence();
    subscribeToUsers();
    subscribeToRooms();
    subscribeToBoards();
    subPlugins();
  }, []);

  function handleRoomClick(room: Room | undefined) {
    if (room) {
      room._id == selectedRoom?._id ? setSelectedRoom(undefined) : setSelectedRoom(room);
      setSelectedBoard(undefined);
      setSelectedUser(undefined);
      // update the URL, helps with history
      toHome(room._id);
    } else {
      setSelectedRoom(undefined);
      setSelectedBoard(undefined);
      setSelectedUser(undefined);
    }
  }

  function handleBoardClick(board: Board) {
    setSelectedBoard(board);
    setSelectedUser(undefined);
  }

  function handleUserClick(user: User) {
    setSelectedUser(user);
  }

  useEffect(() => {
    const room = rooms.find((r) => r._id === selectedRoom?._id);
    if (!room) {
      setSelectedRoom(undefined);
      setSelectedBoard(undefined);
    } else {
      setSelectedRoom(room);
    }
    if (!boards.find((board) => board._id === selectedBoard?._id)) {
      setSelectedBoard(undefined);
    }
  }, [JSON.stringify(rooms), JSON.stringify(boards)]);

  // To handle the case where the user is redirected to the home page from a board
  useEffect(() => {
    function goToMainRoom() {
      // Go to Main Room, should be the oldest room on the server.
      const room = rooms.reduce((prev, curr) => (prev._createdAt < curr._createdAt ? prev : curr));
      handleRoomClick(room);
    }
    if (roomsFetched) {
      if (!selectedRoomId) {
        goToMainRoom();
      } else {
        // Go to room with id. Does room exist, if not go to main room
        const room = rooms.find((room) => room._id === selectedRoomId);
        room ? handleRoomClick(room) : goToMainRoom();
      }
    }
  }, [roomsFetched]);

  return (
    // Main Container
    <Box display="flex" flexDir={'column'} width="100%" height="100%" alignItems="center" justifyContent="space-between" py="10px">
      {/* Check if the user wanted to join a board through a URL */}
      <JoinBoardCheck />
      {/* Top Bar */}
      <Box display="flex" flexDirection="row" justifyContent="space-between" width="100vw" px="2">
        <Box flex="1 1 0px">
          <Text
            fontSize="xl"
            flex="1 1 0px"
            textOverflow={'ellipsis'}
            overflow={'hidden'}
            justifyContent="left"
            display="flex"
            width="100%"
            userSelect="none"
            whiteSpace={'nowrap'}
          >
            Server: {config?.serverName}
          </Text>
        </Box>
        <Box></Box>

        <Box flex="1 1 0px" justifyContent="right" display="flex" alignItems={'start'}>
          <Clock />
        </Box>
      </Box>

      {/* Middle Section */}
      <Box
        display="flex"
        flexDirection="column"
        height="100%"
        maxHeight="100%"
        justifyContent={'space-between'}
        maxWidth="1920px"
        overflow="hidden"
      >
        {/* Search Box */}
        <Box width="100%" display="flex" p="2" pr="4">
          <InputGroup colorScheme="teal">
            <InputLeftElement pointerEvents="none">
              <MdSearch color="white" />{' '}
            </InputLeftElement>
            <Input
              type="text"
              placeholder="Search"
              _placeholder={{ color: 'white' }}
              onChange={handleSearchInput}
              colorScheme="teal"
              _focus={{ outline: 'none !important', borderColor: inputBorderColor, boxShadow: `0px 0px 0px ${inputBorderColor}` }}
            />
          </InputGroup>
        </Box>

        {/* Data Section */}
        <Box display="flex" flex={1} height="100%" width="100%">
          {/* Left Side Rooms */}
          <Box display="flex" flexDirection="column" height="100%" p="8px" flex="1" minWidth="420px" justifyContent={'space-between'}>
            <Box display="flex" justifyContent={'space-between'} width="100%" mb="8px">
              <Text fontSize="2xl">Rooms</Text>
              <Box display="flex" ml="2" justifyContent={'left'} gap="8px">
                <IconButton
                  size="sm"
                  colorScheme="teal"
                  variant={'outline'}
                  aria-label="create-room"
                  fontSize="xl"
                  icon={<MdAdd />}
                ></IconButton>
              </Box>
            </Box>

            <Box overflow="hidden" flex="1" gap="8px" display="flex" flexDir={'column'}>
              {rooms
                .filter(roomsFilter)
                .sort((a, b) => a.data.name.localeCompare(b.data.name))
                .map((room) => {
                  return <RoomRow key={room._id} room={room} selected={selectedRoom?._id === room._id} onClick={handleRoomClick} />;
                })}
            </Box>
            <RoomCard room={selectedRoom} />
          </Box>

          {/* Middle Section Room and Boards */}
          <Box display="flex" flexDirection="column" height="100%" flex="1">
            <Box display="flex" flexDirection="column" flex="1" minWidth="420px" padding="8px">
              <Box display="flex" justifyContent={'space-between'} width="100%" mb="8px">
                <Text fontSize="2xl">Boards</Text>
                <Box display="flex" ml="2" justifyContent={'left'} gap="8px">
                  <IconButton
                    size="sm"
                    colorScheme="teal"
                    variant={'outline'}
                    aria-label="create-room"
                    fontSize="xl"
                    icon={<MdAdd />}
                  ></IconButton>
                </Box>
              </Box>
              <Box overflow="hidden" flex="1" gap="8px" display="flex" flexDir={'column'}>
                {boards
                  .filter(boardsFilter)
                  .sort((a, b) => a.data.name.localeCompare(b.data.name))
                  .map((board) => {
                    return (
                      <BoardRow key={board._id} board={board} selected={selectedBoard?._id === board._id} onClick={handleBoardClick} />
                    );
                  })}
              </Box>
              <BoardCard board={selectedBoard} />
            </Box>
          </Box>

          {/* Right Side Members */}
          <Box display="flex" flexDirection="column" height="100%" p="8px" width="280px">
            <Box px="2" mb="2" display="flex" justifyContent={'space-between'} width="100%">
              <Text fontSize="2xl"> Users</Text>
              <Box display="flex" justifyContent={'left'} gap="8px">
                <IconButton
                  size="sm"
                  colorScheme="teal"
                  variant={'outline'}
                  aria-label="create-room"
                  fontSize="xl"
                  icon={<MdAdd />}
                ></IconButton>
                <IconButton
                  size="sm"
                  colorScheme="teal"
                  variant={'outline'}
                  aria-label="create-room"
                  fontSize="xl"
                  icon={<MdManageAccounts />}
                ></IconButton>
              </Box>
            </Box>
            <Box flex="1" overflow="hidden" mb="4">
              {usersFilter().map((up) => {
                return <UserRow key={up.user._id} user={up.user} onClick={() => handleUserClick(up.user)} />;
              })}
            </Box>
            <UserCard user={selectedUser} presence={presences.find((p) => p._id === selectedUser?._id)} />
          </Box>
        </Box>
      </Box>

      {/* Bottom Bar */}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent={'space-between'}
        width="100%"
        minHeight={'initial'}
        alignItems="center"
        px="2"
        pb="2"
      >
        <MainButton buttonStyle="solid" config={config} />

        <Image src={imageUrl} height="30px" style={{ opacity: 0.7 }} alt="sag3" userSelect={'auto'} draggable={false} />
      </Box>
    </Box>
  );
}

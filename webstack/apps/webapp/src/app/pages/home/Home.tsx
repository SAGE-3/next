/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Box, useColorModeValue, Text, Image, Progress, Button, IconButton, Input, InputLeftElement, InputGroup } from '@chakra-ui/react';

import {
  JoinBoardCheck,
  RoomList,
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
import { Board, Room, User } from '@sage3/shared/types';
import {
  MdAdd,
  MdEdit,
  MdExitToApp,
  MdFavorite,
  MdLink,
  MdLock,
  MdManageAccounts,
  MdPeople,
  MdPerson,
  MdSearch,
  MdSettings,
  MdStar,
  MdStarOutline,
} from 'react-icons/md';

export function HomePage() {
  // URL Params
  const { roomId } = useParams();
  const { toHome } = useRouteNav();

  // Configuration information
  const config = useConfigStore((state) => state.config);

  // Room Store
  const [selectedRoomId] = useState<string | undefined>(roomId);
  const rooms = useRoomStore((state) => state.rooms);
  const subToRooms = useRoomStore((state) => state.subscribeToAllRooms);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const roomsFetched = useRoomStore((state) => state.fetched);

  // Board Store
  const { boards, subscribeToAllBoards } = useBoardStore((state) => state);
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(undefined);

  // Plugins
  const subPlugins = usePluginStore((state) => state.subscribeToPlugins);

  // Users and presence
  const { user } = useUser();
  const users = useUsersStore((state) => state.users);
  const updatePresence = usePresenceStore((state) => state.update);
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);
  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);

  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // UI Colors
  const roomListBackgroud = useColorModeValue('gray.300', 'gray.700');
  const roomListBG = useHexColor(roomListBackgroud);
  const boardListBackground = useColorModeValue('gray.200', 'gray.800');
  const boardListBG = useHexColor(boardListBackground);
  const infoBackground = useColorModeValue('gray.100', 'gray.900');
  const infoBG = useHexColor(infoBackground);
  const borderColor = useHexColor(selectedRoom ? selectedRoom.data.color : 'gray.300');

  // Favorites
  const [showFavorites, setShowFavorites] = useState<boolean>(false);
  const handleShowFavorites = () => {
    setShowFavorites(!showFavorites);
  };

  // Handle Search Input
  const [searchInput, setSearchInput] = useState<string>('');
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };
  const inputBorderColor = useHexColor('teal.200');

  // Filter Search on Rooms, Boards, and Users
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [filteredBoards, setFilteredBoards] = useState<Board[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  useEffect(() => {
    if (searchInput.length > 0) {
      const roomResults = rooms.filter((room) => room.data.name.toLowerCase().includes(searchInput.toLowerCase()));
      const boardResults = boards.filter((board) => board.data.name.toLowerCase().includes(searchInput.toLowerCase()));
      const userResults = users.filter((user) => user.data.name.toLowerCase().includes(searchInput.toLowerCase()));
      setFilteredRooms(roomResults);
      setFilteredBoards(boardResults);
      setFilteredUsers(userResults);
    } else {
      setFilteredRooms(rooms);
      setFilteredBoards(boards);
      setFilteredUsers(users);
    }
  }, [searchInput]);

  // Subscribe to user updates
  useEffect(() => {
    // Update the document title
    document.title = 'SAGE3 - Rooms and Boards';

    subscribeToPresence();
    subscribeToUsers();
    subToRooms();
    subscribeToAllBoards();
    subPlugins();
  }, []);

  function handleRoomClick(room: Room | undefined) {
    if (room) {
      setSelectedRoom(room);
      setFilteredBoards(boards.filter((board) => board.data.roomId === room._id));
      setSelectedBoard(undefined);
      if (user) updatePresence(user._id, { roomId: room._id, boardId: '', following: '' });
      // update the URL, helps with history
      toHome(room._id);
    } else {
      setSelectedRoom(undefined);
      setSelectedBoard(undefined);

      if (user) updatePresence(user._id, { roomId: '', boardId: '', following: '' });
    }
  }

  function handleBoardClick(board: Board) {
    setSelectedBoard(board);
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

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  return (
    // Main Container
    <Box display="flex" flexDir={'column'} width="100%" height="100%" alignItems="center" justifyContent="space-between">
      {/* Check if the user wanted to join a board through a URL */}
      <JoinBoardCheck />
      {/* Top Bar */}
      <Box display="flex" flexDirection="row" justifyContent="space-between" height={'32px'} width="100vw" px="2">
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
        flexDirection="row"
        flexGrow={1}
        justifyContent={'center'}
        maxWidth="1920px"
        height="100%"
        overflow="hidden"
        gap="16px"
        p="16px"
      >
        <Box display="flex" flexDir={'column'} width="100%">
          <Box width="100%" display="flex" p="2" pr="4" gap="8px">
            <IconButton
              size="md"
              colorScheme="teal"
              variant={'outline'}
              aria-label="create-room"
              fontSize="2xl"
              onClick={handleShowFavorites}
              icon={showFavorites ? <MdStar /> : <MdStarOutline />}
            ></IconButton>
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

          {roomsFetched ? (
            <Box display="flex" height="100%" width="100%">
              {/* Left Side Rooms */}
              <Box
                display="flex"
                flexDirection="column"
                height="100%"
                p="8px"
                // flex="1"
                // justifyContent={'space-between'}
                // borderRadius="md"
                // border="solid gray 2px"
                flex="1"
                minWidth="420px"
                // background={boardListBG}
              >
                <Box display="flex" mb="2" justifyContent={'space-between'} width="100%">
                  <Text mb="2" fontSize="2xl">
                    Rooms
                  </Text>
                  <Box mb="2" display="flex" ml="2" justifyContent={'left'} gap="8px">
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
                      icon={<MdSearch />}
                    ></IconButton>
                  </Box>
                </Box>

                <Box overflow="hidden" flex="1">
                  {filteredRooms
                    .sort((a, b) => a.data.name.localeCompare(b.data.name))
                    .map((room) => {
                      return <RoomCard key={room._id} room={room} selected={selectedRoom?._id === room._id} onClick={handleRoomClick} />;
                    })}
                </Box>
                <Box
                  display="flex"
                  flexDirection="column"
                  borderRadius="md"
                  height="240px"
                  // border={`solid ${selectedRoom ? borderColor : 'transparent'} 2px`}
                  background={linearBGColor}
                  padding="8px"
                >
                  <Box display="flex" justifyContent={'space-between'}>
                    <Box px="2" mb="2" display="flex" justifyContent={'space-between'} width="100%">
                      <Text fontSize="2xl">{selectedRoom ? selectedRoom.data.name : 'Room'}</Text>
                      <Box display="flex" justifyContent={'left'} gap="8px">
                        <IconButton
                          size="sm"
                          colorScheme="teal"
                          variant={'outline'}
                          aria-label="create-room"
                          fontSize="xl"
                          icon={<MdEdit />}
                        ></IconButton>
                      </Box>
                    </Box>
                  </Box>
                  <Box flex="1" display="flex" my="4" px="2" flexDir="column">
                    <Box>
                      <Text fontSize="sm">{selectedRoom?.data.description}</Text>
                      <Text fontSize="sm">Owner: {users.find((u) => u._id === selectedRoom?.data.ownerId)?.data.name}</Text>
                      <Text fontSize="sm">Created: Jan 5th, 2023</Text>
                      <Text fontSize="sm">Updated: Oct 5th, 2023</Text>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Middle Section Room and Boards */}
              <Box display="flex" flexDirection="column" height="100%" flex="1" gap="16px">
                <Box display="flex" flexDirection="column" flex="1" minWidth="420px" padding="8px">
                  <Box display="flex" justifyContent={'space-between'}>
                    <Box mb="2" display="flex" justifyContent={'space-between'} width="100%">
                      <Text fontSize="2xl">Boards</Text>
                      <Box mb="2" display="flex" justifyContent={'left'} gap="8px">
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
                  </Box>
                  <Box flex="1" overflow="hidden" mb="4">
                    {filteredBoards
                      .sort((a, b) => a.data.name.localeCompare(b.data.name))
                      .map((board) => {
                        return (
                          <BoardCard key={board._id} board={board} selected={selectedBoard?._id === board._id} onClick={handleBoardClick} />
                        );
                      })}
                  </Box>
                  <Box
                    display="flex"
                    flexDirection="column"
                    borderRadius="md"
                    height="240px"
                    // border={`solid ${selectedRoom ? borderColor : 'transparent'} 2px`}
                    background={linearBGColor}
                    padding="8px"
                  >
                    <Box display="flex" justifyContent={'space-between'}>
                      <Box px="2" mb="2" display="flex" justifyContent={'space-between'} width="100%">
                        <Text fontSize="2xl">{selectedBoard?.data.name}</Text>
                        <Box display="flex" justifyContent={'left'} gap="8px">
                          <IconButton
                            size="sm"
                            variant={'outline'}
                            colorScheme="teal"
                            aria-label="enter-board"
                            fontSize="xl"
                            icon={<MdLink />}
                          ></IconButton>
                          <IconButton
                            size="sm"
                            colorScheme="teal"
                            variant={'outline'}
                            aria-label="create-room"
                            fontSize="xl"
                            icon={<MdEdit />}
                          ></IconButton>
                        </Box>
                      </Box>
                    </Box>
                    <Box flex="1" display="flex" my="4" px="2" flexDir="column">
                      <Box>
                        <Text fontSize="sm">This is the board's description.</Text>
                        <Text fontSize="sm">Owner: {users.find((u) => u._id === selectedBoard?.data.ownerId)?.data.name}</Text>
                        <Text fontSize="sm">Created: Jan 5th, 2023</Text>
                        <Text fontSize="sm">Updated: Oct 5th, 2023</Text>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Right Side Members */}
              <Box
                display="flex"
                flexDirection="column"
                height="100%"
                p="8px"
                width="320px"
                // background={boardListBG}
              >
                <Box px="2" mb="2" display="flex" justifyContent={'space-between'} width="100%">
                  <Text fontSize="2xl"> Room Members</Text>
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
                  {filteredUsers.map((user) => {
                    return <UserCard key={user._id} user={user} onClick={() => {}} />;
                  })}
                </Box>
              </Box>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" justifyContent={'center'} alignItems="center" height="100%" width="100%">
              <Progress isIndeterminate width="100%" borderRadius="md" />
            </Box>
          )}
        </Box>
      </Box>
      {/* {roomsFetched ? (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent={'center'}
            alignItems="flex-start"
            height="100%"
            width="100%"
            maxWidth="1200"
          >
            <RoomList
              selectedRoom={selectedRoom}
              onRoomClick={handleRoomClick}
              rooms={rooms}
              boards={boards}
              onBackClick={() => handleRoomClick(undefined)}
              onBoardClick={handleBoardClick}
            ></RoomList>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" justifyContent={'center'} alignItems="center" height="100%" width="100%">
            <Progress isIndeterminate width="100%" borderRadius="md" />
          </Box>
        )}
      </Box> */}

      {/* Bottom Bar */}
      <Box display="flex" flexDirection="row" justifyContent={'space-between'} width="100%" minHeight={'initial'} alignItems="center" p="2">
        <MainButton buttonStyle="solid" config={config} />

        <Image src={imageUrl} height="30px" mb="2" style={{ opacity: 0.7 }} alt="sag3" userSelect={'auto'} draggable={false} />
      </Box>
    </Box>
  );
}

function RoomCard(props: { room: Room; selected: boolean; onClick: (room: Room) => void }) {
  const borderColorValue = useColorModeValue(props.room.data.color, props.room.data.color);
  const borderColor = useHexColor(borderColorValue);
  const borderColorGray = useColorModeValue('gray.300', 'gray.700');
  const borderColorG = useHexColor(borderColorGray);

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const created = new Date(props.room._createdAt).toLocaleDateString();
  return (
    <Box
      // my="4"
      background={linearBGColor}
      p="1"
      pl="4"
      my="2"
      display="flex"
      justifyContent={'space-between'}
      alignItems={'center'}
      borderColor={props.selected ? borderColor : borderColor}
      onClick={() => props.onClick(props.room)}
      border={`solid 1px ${props.selected ? borderColor : 'none'}`}
      borderLeft={`${borderColor} solid 8px`}
      borderRadius="md"
      boxSizing="border-box"
      backgroundColor={props.selected ? borderColorG : 'transparent'}
      _hover={{ cursor: 'pointer', backgroundColor: borderColorG }}
    >
      <Box display="flex" flexDir="column">
        <Text fontSize="lg" fontWeight="bold" textAlign="left">
          {props.room.data.name}
        </Text>
        <Text fontSize="xs" textAlign="left">
          {props.room.data.description}
        </Text>
      </Box>
      <Box display="flex" gap="4px">
        <IconButton
          size="sm"
          variant={'ghost'}
          aria-label="enter-board"
          fontSize="xl"
          colorScheme="teal"
          icon={<Text>{(Math.random() * 25).toFixed()}</Text>}
        ></IconButton>

        <IconButton size="sm" variant={'ghost'} colorScheme="teal" aria-label="enter-board" fontSize="xl" icon={<MdLock />}></IconButton>
        <IconButton size="sm" variant={'ghost'} colorScheme="teal" aria-label="enter-board" fontSize="xl" icon={<MdStar />}></IconButton>
      </Box>
    </Box>
  );
}

function BoardCard(props: { board: Board; selected: boolean; onClick: (board: Board) => void }) {
  const borderColorValue = useColorModeValue(props.board.data.color, props.board.data.color);
  const borderColor = useHexColor(borderColorValue);
  const borderColorGray = useColorModeValue('gray.300', 'gray.700');
  const borderColorG = useHexColor(borderColorGray);

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );
  return (
    <Box
      my="2"
      p="1"
      px="2"
      display="flex"
      borderRadius="md"
      justifyContent={'space-between'}
      alignContent={'center'}
      onClick={() => props.onClick(props.board)}
      border={`solid 1px ${props.selected ? borderColor : 'none'}`}
      borderLeft={`${borderColor} solid 8px`}
      background={linearBGColor}
      _hover={{ cursor: 'pointer' }}
    >
      <Text fontSize="md" textAlign="center" lineHeight="32px" fontWeight="bold">
        {props.board.data.name}
      </Text>
      <Box display="flex" gap="2px">
        <IconButton
          size="sm"
          variant={'ghost'}
          aria-label="enter-board"
          fontSize="xl"
          colorScheme="teal"
          icon={<Text>{(Math.random() * 25).toFixed()}</Text>}
        ></IconButton>

        <IconButton size="sm" variant={'ghost'} colorScheme="teal" aria-label="enter-board" fontSize="xl" icon={<MdLock />}></IconButton>

        <IconButton size="sm" variant={'ghost'} colorScheme="teal" aria-label="enter-board" fontSize="xl" icon={<MdStar />}></IconButton>
        <IconButton
          size="sm"
          variant={'ghost'}
          colorScheme="teal"
          aria-label="enter-board"
          fontSize="xl"
          icon={<MdExitToApp />}
        ></IconButton>
      </Box>
    </Box>
  );
}

function UserCard(props: { user: User; onClick: (user: User) => void }) {
  const borderColorValue = useColorModeValue(props.user.data.color, props.user.data.color);
  const borderColor = useHexColor(borderColorValue);
  const borderColorGray = useColorModeValue('gray.300', 'gray.600');
  const borderColorG = useHexColor(borderColorGray);

  const offline = useHexColor('teal');
  const online = useHexColor('gray.700');
  return (
    <Box
      my="2"
      p="2"
      width="100%"
      display="flex"
      justifyContent={'space-between'}
      // alignContent={'center'}
      onClick={() => props.onClick(props.user)}
      borderRadius="md"
      _hover={{ cursor: 'pointer', background: borderColorG }}
    >
      <Box display="flex">
        <IconButton
          size="xs"
          variant={'ghost'}
          aria-label="enter-board"
          fontSize="2xl"
          mr="2"
          color={Math.random() > 0.5 ? offline : online}
          icon={<MdPerson />}
        ></IconButton>

        <Text fontSize="sm" fontWeight="bold" textAlign="center" lineHeight="24px">
          {props.user.data.name}
        </Text>
      </Box>
      <Box>
        {' '}
        <Text fontSize="xs" fontWeight="bold" textAlign="center" lineHeight="24px">
          Board Name
        </Text>
      </Box>
    </Box>
  );
}

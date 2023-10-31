/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  Box,
  useColorModeValue,
  Text,
  Image,
  IconButton,
  Input,
  InputLeftElement,
  InputGroup,
  useDisclosure,
  Icon,
  useToast,
  Button,
} from '@chakra-ui/react';

import { UserRow, BoardRow, RoomRow, RoomCard, BoardCard, UserCard, SearchList, FavoritesList } from './components';

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
  CreateRoomModal,
  CreateBoardModal,
  useHotkeys,
} from '@sage3/frontend';
import { Board, Presence, Room, User } from '@sage3/shared/types';
import { MdAdd, MdApps, MdFolder, MdPeople, MdSearch, MdStar } from 'react-icons/md';
import { set } from 'date-fns';
import { SAGE3Ability } from '@sage3/shared';

export type UserPresence = {
  user: User;
  presence: Presence | undefined;
};

export function HomePage() {
  // URL Params
  const { roomId, boardId } = useParams();
  const { toHome } = useRouteNav();

  // Configuration information
  const config = useConfigStore((state) => state.config);

  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // User
  const { user } = useUser();

  // Plugin Store
  const subPlugins = usePluginStore((state) => state.subscribeToPlugins);

  // Room Store
  const {
    rooms,
    members,
    subscribeToAllRooms: subscribeToRooms,
    fetched: roomsFetched,
    joinRoomMembership,
  } = useRoomStore((state) => state);

  // Board Store
  const { boards, subscribeToAllBoards: subscribeToBoards } = useBoardStore((state) => state);

  // User and Presence Store
  const { users, subscribeToUsers } = useUsersStore((state) => state);
  const { update: updatePresence, subscribe: subscribeToPresence, presences } = usePresenceStore((state) => state);

  // User Selected Room, Board, and User
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);

  // Handle Search Input
  const [searchInput, setSearchInput] = useState<string>('');
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setSelectedRoom(undefined);
    setSelectedBoard(undefined);
    setSelectedUser(undefined);
  };

  // Toast to inform user that they are not a member of a room
  const toast = useToast();

  // Colors
  const inputBorderColor = useHexColor('teal.200');
  const searchPlaceHolderColor = useColorModeValue('gray.900', 'gray.100');
  const searchColor = useHexColor(searchPlaceHolderColor);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // Modals
  const { isOpen: createRoomModalIsOpen, onOpen: createRoomModalOnOpen, onClose: createRoomModalOnClose } = useDisclosure();
  const { isOpen: createBoardModalIsOpen, onOpen: createBoardModalOnOpen, onClose: createBoardModalOnClose } = useDisclosure();
  const { isOpen: favoritesIsOpen, onOpen: favoritesOnOpen, onClose: favoritesOnClose } = useDisclosure();

  // Permissions
  const canJoin = SAGE3Ability.canCurrentUser('join', 'roommembers');
  const canCreateRoom = SAGE3Ability.canCurrentUser('create', 'rooms');
  const canCreateBoards = SAGE3Ability.canCurrentUser('create', 'boards');

  // On Search or Favorite Clicks
  const handleExternalRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    // Check if this user is a member of this room
    const roomMembership = members.find((m) => m.data.roomId === room._id);
    const isMember = roomMembership && roomMembership.data.members && user ? roomMembership.data.members.includes(user?._id) : false;
    if (!isMember && canJoin) {
      toast({
        title: 'Not a Member of Room',
        description: (
          <Box display="flex">
            Would you like to join '{room.data.name}'?
            <Button
              colorScheme="yellow"
              variant="solid"
              size="xs"
              ml="2"
              onClick={() => {
                joinRoomMembership(room._id);
                toast.closeAll();
              }}
            >
              Join
            </Button>
          </Box>
        ),
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  const handleExternalBoardSelect = (board: Board) => {
    setSelectedBoard(board);
    setSelectedRoom(rooms.find((r) => r._id === board.data.roomId));
  };
  const handleExternalUserSelect = (user: User) => {
    setSelectedUser(user);
    const presence = presences.find((p) => p._id === user._id);
    if (presence) {
      const roomId = presence.data.roomId;
      const boardId = presence.data.boardId;
      const room = rooms.find((r) => r._id === roomId);
      const board = boards.find((b) => b._id === boardId);
      setSelectedRoom(room);
      setSelectedBoard(board);
    }
  };

  // Filter Functions
  const roomsFilter = (room: Room): boolean => {
    if (!user) return false;
    const roomMembership = members.find((m) => m.data.roomId === room._id);
    const isMember = roomMembership && roomMembership.data.members && user ? roomMembership.data.members.includes(user?._id) : false;
    const isOwner = room.data.ownerId === user?._id;
    const isCurrentRoom = selectedRoom ? selectedRoom._id === room._id : false;
    return isMember || isCurrentRoom;
  };
  const boardsFilter = (board: Board): boolean => {
    return selectedRoom ? board.data.roomId === selectedRoom?._id : false;
  };
  const concatUserPresence = (userList: User[]): UserPresence[] => {
    return userList.map((u) => {
      return { user: u, presence: presences.find((p) => p._id === u._id) };
    });
  };
  const usersFilter = (): UserPresence[] => {
    if (selectedRoom) {
      const roomUserIds = members.find((m) => m.data.roomId === selectedRoom._id)?.data.members || [];
      const roomUsers = users.filter((user) => roomUserIds.includes(user._id));
      return concatUserPresence(roomUsers);
    } else {
      return [];
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

  // Change of room
  useEffect(() => {
    if (user) {
      const roomId = selectedRoom ? selectedRoom._id : '';
      updatePresence(user?._id, { roomId });
    }
  }, [selectedRoom]);

  // Function to handle states for when a user clicks on a room
  function handleRoomClick(room: Room | undefined) {
    if (room) {
      // If the room is already selected, deselect it
      room._id == selectedRoom?._id ? setSelectedRoom(undefined) : setSelectedRoom(room);
      setSelectedBoard(undefined);
      setSelectedUser(undefined);
      // update the URL, helps with history
      toHome(room._id);
    } else {
      handleLeaveRoom();
    }
  }

  // Function to handle states for when a user clicks on a board
  function handleBoardClick(board: Board) {
    if (board) {
      board._id == selectedBoard?._id ? setSelectedBoard(undefined) : setSelectedBoard(board);
      setSelectedUser(undefined);
    } else {
      setSelectedBoard(undefined);
      setSelectedUser(undefined);
    }
  }

  // Function to handle states for when a user clicks on a user
  function handleUserClick(user: User) {
    if (user) {
      user._id == selectedUser?._id ? setSelectedUser(undefined) : setSelectedUser(user);
    }
  }

  // Function to handle states for when a user leaves a room (unjoins)
  function handleLeaveRoom() {
    setSelectedRoom(undefined);
    setSelectedBoard(undefined);
    setSelectedUser(undefined);
  }

  // Handle when the rooms and boards change
  useEffect(() => {
    // Check to see if the room you are in still exists
    if (!rooms.find((r) => r._id === selectedRoom?._id)) {
      setSelectedRoom(undefined);
      setSelectedBoard(undefined);
    }
    // Check to see if the board you are in still exists
    if (!boards.find((board) => board._id === selectedBoard?._id)) {
      setSelectedBoard(undefined);
    }
  }, [JSON.stringify(rooms), JSON.stringify(boards)]);

  // To handle the case where the user is redirected to the home page from a board
  useEffect(() => {
    // Get the RoomId from the URL
    if (roomId) {
      // Find room
      const room = rooms.find((r) => r._id === roomId);
      // If the room exists, select it
      if (room) {
        setSelectedRoom(room);
        // Get the BoardId from the URL
        if (boardId) {
          // Find board
          const board = boards.find((b) => b._id === boardId);
          // If the board exists, select it
          if (board) {
            setSelectedBoard(board);
          }
        }
      }
    }
  }, [roomsFetched]);

  useHotkeys('esc', () => {
    setSearchInput('');
    setSelectedRoom(undefined);
    setSelectedBoard(undefined);
    setSelectedUser(undefined);
  });

  return (
    // Main Container
    <Box display="flex" flexDir={'column'} width="100%" height="100vh" alignItems="center">
      {/* Check if the user wanted to join a board through a URL */}
      <JoinBoardCheck />
      {/* Modal to create a room */}
      <CreateRoomModal isOpen={createRoomModalIsOpen} onClose={createRoomModalOnClose} />
      {/* Modal to create a board */}
      <CreateBoardModal isOpen={createBoardModalIsOpen} onClose={createBoardModalOnClose} roomId={selectedRoom ? selectedRoom._id : ''} />
      {/* Favorites Modal */}
      <FavoritesList
        isOpen={favoritesIsOpen}
        onClose={favoritesOnClose}
        onRoomClick={handleExternalRoomSelect}
        onBoardClick={handleExternalBoardSelect}
        onUserClick={handleExternalUserSelect}
      />

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
      <Box flex="1" display="flex" flexDirection="column" maxWidth="1920px" overflow="hidden">
        {/* Search Box */}
        <Box width="100%" display="flex" p="2" pr="4">
          <Box mr="2">
            <IconButton
              size="md"
              colorScheme="teal"
              variant={'outline'}
              aria-label="create-room"
              fontSize="xl"
              onClick={() => {
                setSearchInput('');
                favoritesOnOpen();
              }}
              icon={<MdStar />}
            ></IconButton>
          </Box>
          <Box width="100%">
            <InputGroup colorScheme="teal" ref={searchInputRef}>
              <InputLeftElement pointerEvents="none">
                <MdSearch />
              </InputLeftElement>
              <Input
                type="text"
                placeholder="Search for Rooms, Boards, or Users..."
                _placeholder={{ color: searchColor }}
                onChange={handleSearchInput}
                onKeyDown={(ev) => {
                  // If esc pressed while focused on search input, clear search
                  if (ev.keyCode === 27) {
                    setSearchInput('');
                  }
                }}
                colorScheme="teal"
                value={searchInput}
                _focus={{ outline: 'none !important', borderColor: inputBorderColor, boxShadow: `0px 0px 0px ${inputBorderColor}` }}
              />
            </InputGroup>
            <Box position="absolute" width="100%">
              {searchInput !== '' && (
                <SearchList
                  searchInput={searchInput}
                  searchDiv={searchInputRef.current}
                  setSearch={setSearchInput}
                  onRoomClick={handleExternalRoomSelect}
                  onBoardClick={handleExternalBoardSelect}
                  onUserClick={handleExternalUserSelect}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Data Section */}
        <Box flex="1" display="flex" width="100%">
          {/* Left Side Rooms */}
          <Box display="flex" flexDirection="column" p="8px" width="420px" justifyContent={'space-between'}>
            <Box display="flex" justifyContent={'space-between'} width="100%" mb="8px">
              <Box display="flex">
                <Icon fontSize="28px" mr="2">
                  <MdFolder />
                </Icon>
                <Text fontSize="2xl">Rooms</Text>
              </Box>

              <Box display="flex" ml="2" justifyContent={'left'} gap="8px">
                <IconButton
                  size="sm"
                  colorScheme="teal"
                  variant={'outline'}
                  aria-label="create-room"
                  fontSize="xl"
                  onClick={createRoomModalOnOpen}
                  isDisabled={!canCreateRoom}
                  icon={<MdAdd />}
                ></IconButton>
              </Box>
            </Box>

            <Box
              flex="1"
              overflowY="scroll"
              gap="8px"
              display="flex"
              flexDir={'column'}
              css={{
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }}
            >
              {rooms
                .filter(roomsFilter)
                .sort((a, b) => a.data.name.localeCompare(b.data.name))
                .map((room) => {
                  return (
                    <RoomRow
                      key={room._id}
                      room={room}
                      selected={selectedRoom?._id === room._id}
                      onClick={handleRoomClick}
                      usersPresent={presences.filter((p) => p.data.roomId === room._id).length}
                    />
                  );
                })}
            </Box>
          </Box>

          {/* Middle Section Room and Boards */}
          <Box display="flex" flexDirection="column" p="8px" width="420px" justifyContent={'space-between'}>
            <Box display="flex" justifyContent={'space-between'} width="100%" mb="8px">
              <Box display="flex">
                <Icon fontSize="28px" mr="2">
                  <MdApps />
                </Icon>
                <Text fontSize="2xl">Boards</Text>
              </Box>
              <Box display="flex" ml="2" justifyContent={'left'} gap="8px">
                <IconButton
                  size="sm"
                  colorScheme="teal"
                  variant={'outline'}
                  aria-label="create-room"
                  fontSize="xl"
                  isDisabled={!selectedRoom || !canCreateBoards}
                  onClick={createBoardModalOnOpen}
                  icon={<MdAdd />}
                ></IconButton>
              </Box>
            </Box>
            <Box
              flex="1"
              overflowY="scroll"
              gap="8px"
              display="flex"
              flexDir={'column'}
              css={{
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }}
            >
              {boards
                .filter(boardsFilter)
                .sort((a, b) => a.data.name.localeCompare(b.data.name))
                .map((board) => {
                  return (
                    <BoardRow
                      key={board._id}
                      board={board}
                      selected={selectedBoard?._id === board._id}
                      onClick={handleBoardClick}
                      usersPresent={presences.filter((p) => p.data.boardId === board._id).length}
                    />
                  );
                })}
            </Box>
          </Box>

          {/* Right Side Members */}
          <Box display="flex" flexDirection="column" p="8px" width="420px" justifyContent={'space-between'}>
            <Box display="flex" justifyContent={'space-between'} width="100%" mb="8px">
              <Box display="flex">
                <Icon fontSize="28px" mr="2">
                  <MdPeople />
                </Icon>
                <Text fontSize="2xl">Members</Text>
              </Box>
              <Box display="flex" justifyContent={'left'} gap="8px"></Box>
            </Box>
            <Box flex="1" overflow="hidden" mb="4" width="100%">
              <Box
                display="flex"
                flexDir="column"
                overflowY="scroll"
                height="100%"
                css={{
                  '&::-webkit-scrollbar': {
                    display: 'none',
                  },
                }}
              >
                {usersFilter().map((up) => {
                  return (
                    <UserRow
                      key={up.user._id}
                      userPresence={up}
                      selected={selectedUser?._id == up.user._id}
                      onClick={() => handleUserClick(up.user)}
                    />
                  );
                })}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Card Section showing current Selection */}
        <Box display="flex" width="100%">
          <Box width="420px" p="8px">
            <RoomCard room={selectedRoom} leaveRoom={handleLeaveRoom} />
          </Box>

          <Box width="420px" p="8px">
            <BoardCard board={selectedBoard} />
          </Box>
          <Box width="420px" p="8px">
            <UserCard user={selectedUser} presence={undefined} />
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

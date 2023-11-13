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
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
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
import { MdAdd, MdApps, MdChevronLeft, MdChevronRight, MdFolder, MdOutlineChevronLeft, MdPeople, MdSearch, MdStar } from 'react-icons/md';
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

  const sideBarRef = useRef<HTMLDivElement>(null);
  const toggleSidebarButtonRef = useRef<HTMLButtonElement>(null);
  const [sidebarState, setsidebarState] = useState<'open' | 'closed'>('open');

  const toggleSidebar = () => {
    if (sideBarRef.current) {
      sidebarState == 'open' ? setsidebarState('closed') : setsidebarState('open');
    }
  };

  return (
    // Main Container
    <Box display="flex" width="100%" height="100vh" alignItems="center">
      {/* Check if the user wanted to join a board through a URL */}
      <JoinBoardCheck />
      {/* Modal to create a room */}
      <CreateRoomModal isOpen={createRoomModalIsOpen} onClose={createRoomModalOnClose} />
      {/* Modal to create a board */}
      <CreateBoardModal isOpen={createBoardModalIsOpen} onClose={createBoardModalOnClose} roomId={selectedRoom ? selectedRoom._id : ''} />

      {/* Toggle Sidebar Button */}
      <Button
        ref={toggleSidebarButtonRef}
        onClick={toggleSidebar}
        position="absolute"
        top="0px"
        transition="all 0.5s"
        margin="8px"
        size="sm" 
        variant="outline"
        left={sidebarState == 'open' ? '400px' : '0px'}
      >
        {sidebarState == 'open' ? <MdChevronLeft fontSize="24px" /> : <MdChevronRight fontSize="24px" />}
      </Button>
      {/* Sidebar Drawer */}
      <Box
        ref={sideBarRef}
        backgroundColor="gray.900"
        width={sidebarState == 'open' ? '400px' : 'px'}
        transition="all 0.5s"
        height="100vh"
        display="flex"
        flexDirection="column"
      >
        {/*  */}
        <Box>
          
        </Box>
      </Box>
    </Box>
  );
}

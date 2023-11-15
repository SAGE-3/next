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
  VStack,
  StackDivider,
  Divider,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Tag,
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
import {
  MdAdd,
  MdApps,
  MdChevronLeft,
  MdChevronRight,
  MdCircle,
  MdCloud,
  MdExitToApp,
  MdFolder,
  MdHome,
  MdHomeFilled,
  MdHouse,
  MdOutlineChevronLeft,
  MdPeople,
  MdPerson,
  MdRoom,
  MdSearch,
  MdStar,
  MdStarOutline,
  MdTimelapse,
  MdTimer,
} from 'react-icons/md';
import { set } from 'date-fns';
import { SAGE3Ability } from '@sage3/shared';
import { IoMdTime } from 'react-icons/io';

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
  const roomMemberFilter = (room: Room): boolean => {
    if (!user) return false;
    const roomMembership = members.find((m) => m.data.roomId === room._id);
    const isMember = roomMembership && roomMembership.data.members && user ? roomMembership.data.members.includes(user?._id) : false;
    const isOwner = room.data.ownerId === user?._id;
    return isMember || isOwner;
  };
  const boardStarredFilter = (board: Board): boolean => {
    return user ? user?.data.savedBoards.includes(board._id) : false;
  };
  const concatUserPresence = (userList: User[]): UserPresence[] => {
    return userList.map((u) => {
      return { user: u, presence: presences.find((p) => p._id === u._id) };
    });
  };
  const usersFilter = (): UserPresence[] => {
    if (selectedRoom) {
      const roomUserIds = members.find((m) => m.data.roomId === selectedRoom._id)?.data.members || [];
      roomUserIds.push(selectedRoom.data.ownerId);
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
      setSelectedBoard(board);
      const room = rooms.find((r) => r._id === board.data.roomId);
      setSelectedRoom(room);
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

      {/* Sidebar Drawer */}
      <Box
        ref={sideBarRef}
        backgroundColor="gray.900"
        width={sidebarState == 'open' ? '400px' : '0px'}
        transition="width 0.5s"
        height="100vh"
        display="flex"
        flexDirection="column"
        borderRight="1px solid gray"
      >
        {sidebarState == 'open' && (
          <>
            <Box px="4" py="2">
              <Text fontSize="3xl" fontWeight="bold">
                {/* {config.serverName} */}
                Chicago Development
              </Text>
            </Box>

            <Box
              display="flex"
              flexDirection="column"
              justifyItems="start"
              flex="1"
              overflowY="scroll"
              css={{
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }}
            >
              <VStack spacing={0} align="stretch">
                <Box
                  h="40px"
                  display="flex"
                  justifyContent={'left'}
                  alignItems={'center'}
                  transition="all 0.5s"
                  _hover={{ backgroundColor: 'teal', cursor: 'pointer' }}
                  pl="2"
                >
                  <Icon as={MdSearch} fontSize="24px" mx="2" /> <Text fontSize="lg">Search for Rooms</Text>
                </Box>
                <Box
                  h="40px"
                  display="flex"
                  justifyContent={'left'}
                  alignItems={'center'}
                  transition="all 0.5s"
                  _hover={{ backgroundColor: 'teal', cursor: 'pointer' }}
                  pl="2"
                >
                  <Icon as={MdExitToApp} fontSize="24px" mx="2" /> <Text fontSize="lg">Enter Board by Link</Text>
                </Box>
                <Box
                  h="40px"
                  display="flex"
                  justifyContent={'left'}
                  alignItems={'center'}
                  transition="all 0.5s"
                  _hover={{ backgroundColor: 'teal', cursor: 'pointer' }}
                  pl="2"
                  onClick={createBoardModalOnOpen}
                >
                  <Icon as={MdAdd} fontSize="24px" mx="2" /> <Text fontSize="lg">Create Room</Text>
                </Box>
                <Accordion defaultIndex={[0]} allowMultiple>
                  <AccordionItem border="none">
                    <AccordionButton
                      _hover={{ backgroundColor: 'teal', cursor: 'pointer' }}
                      _expanded={{ backgroundColor: 'teal' }}
                      transition={'all 0.5s'}
                      pl="2"
                    >
                      <Box display="flex" flex="1" alignItems="left">
                        <Icon as={MdHome} fontSize="24px" mx="2" /> <Text fontSize="md">Rooms</Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>

                    <AccordionPanel p="0">
                      <VStack align="stretch" gap="0">
                        {rooms.filter(roomMemberFilter).map((room) => (
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="left"
                            transition="all 0.5s"
                            pl="48px"
                            height="28px"
                            backgroundColor={room._id === selectedRoom?._id ? 'gray' : ''}
                            _hover={{ backgroundColor: 'gray', cursor: 'pointer' }}
                            onClick={() => handleRoomClick(room)}
                          >
                            <Text fontSize="md">{room.data.name}</Text>
                          </Box>
                        ))}
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                  {/* <AccordionItem border="none">
                    <AccordionButton pl="2" _hover={{ backgroundColor: 'teal', cursor: 'pointer' }} _expanded={{ backgroundColor: 'teal' }}>
                      <Box display="flex" flex="1" alignItems="left">
                        <Icon as={IoMdTime} fontSize="24px" mx="2" /> <Text fontSize="md">Recent Boards</Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>

                    <AccordionPanel pb={4}>
                      <VStack spacing={2} align="stretch" pl="24px">
                        {boards.filter(boardStarredFilter).map((board) => (
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="left"
                            transition="all 0.5s"
                            pl="2"
                            _hover={{ backgroundColor: 'gray', cursor: 'pointer' }}
                          >
                            <Text fontSize="md">{board.data.name}</Text>
                          </Box>
                        ))}
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem> */}

                  <AccordionItem border="none">
                    <AccordionButton _hover={{ backgroundColor: 'teal', cursor: 'pointer' }} _expanded={{ backgroundColor: 'teal' }} pl="2">
                      <Box display="flex" flex="1" alignItems="left">
                        <Icon as={MdStarOutline} fontSize="24px" mx="2" /> <Text fontSize="md">Starred Boards</Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>

                    <AccordionPanel p="0">
                      <VStack align="stretch" gap="0">
                        {boards.filter(boardStarredFilter).map((board) => (
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="left"
                            transition="all 0.5s"
                            pl="48px"
                            height="28px"
                            backgroundColor={board._id === selectedBoard?._id ? 'gray' : ''}
                            _hover={{ backgroundColor: 'gray', cursor: 'pointer' }}
                            onClick={() => handleBoardClick(board)}
                          >
                            <Text fontSize="md">{board.data.name}</Text>
                          </Box>
                        ))}
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </VStack>
            </Box>
            <Box
              marginTop="auto"
              display="flex"
              backgroundColor="teal  "
              height="40px"
              alignItems={'center'}
              width="100%"
              transition={'all 0.5s'}
              _hover={{ cursor: 'pointer', backgroundColor: 'teal.600' }}
            >
              <Icon as={MdPerson} fontSize="24px" mx="2" />{' '}
              <Text fontSize="md" fontWeight={'bold'}>
                Ryan Theriot
              </Text>
            </Box>
          </>
        )}
      </Box>

      {/* Room Area*/}
      <Box
        display="flex"
        flex="1"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        backgroundColor="#020202"
        overflow="hidden"
        height="100vh"
        padding="8"
      >
        <Box width="100%" height="300px">
          {/* Room Information */}
          <Text fontSize="3xl" fontWeight="bold">
            {selectedRoom ? selectedRoom.data.name : 'No Room Selected'}
            <Text fontSize="xl" fontWeight={'normal'}>
              {' '}
              {selectedRoom?.data.description}
            </Text>
          </Text>
          {selectedRoom && (
            <VStack alignItems={'start'}>
              <Tag colorScheme={selectedRoom.data.color} variant="solid" mr="2">
                Created by {users.find((u) => u._id === selectedRoom.data.ownerId)?.data.name}
              </Tag>

              <Tag colorScheme={selectedRoom.data.color} variant="solid">
                Created on {new Date(selectedRoom._createdAt).toLocaleDateString()}
              </Tag>
            </VStack>
          )}
        </Box>

        <Box width="100%" height="100%">
          <Tabs colorScheme={selectedRoom ? selectedRoom.data.color : 'teal'}>
            <TabList>
              <Tab>Boards</Tab>
              <Tab>Members</Tab>
              <Tab>Settings</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                {selectedRoom && (
                  <Box display="flex" gap="4">
                    <Box display="flex" flexDir={'column'} gap="2" flexWrap="wrap" justifyContent="start">
                      {boards
                        .filter((board) => board.data.roomId === selectedRoom?._id)
                        .map((board) => (
                          <BoardRow
                            key={board._id}
                            board={board}
                            onClick={() => handleBoardClick(board)}
                            selected={false}
                            usersPresent={presences.filter((p) => p.data.boardId === board._id).length}
                          />
                        ))}
                    </Box>
                    <Box>
                      {/* Board Info */}
                      <Box width="100%" height="300px">
                        <Text fontSize="3xl" fontWeight="bold">
                          {selectedBoard ? selectedBoard.data.name : 'No Board Selected'}
                        </Text>
                        <Text fontSize="xl" fontWeight={'normal'}>
                          {selectedBoard?.data.description}
                        </Text>
                      </Box>
                    </Box>
                  </Box>
                )}
              </TabPanel>
              <TabPanel>
                <Box
                  display="flex"
                  flexDir="column"
                  overflowY="scroll"
                  height="100%"
                  width="400px"
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
              </TabPanel>
              <TabPanel>SETTINGS</TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Box>
      <Image
        position="absolute"
        right="2"
        bottom="2"
        src={imageUrl}
        height="30px"
        style={{ opacity: 0.7 }}
        alt="sag3"
        userSelect={'auto'}
        draggable={false}
      />
    </Box>
  );
}

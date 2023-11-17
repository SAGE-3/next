/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  Box,
  useColorModeValue,
  Text,
  Image,
  useDisclosure,
  Icon,
  useToast,
  Button,
  VStack,
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
  useColorMode,
  Tooltip,
} from '@chakra-ui/react';

import { UserRow, BoardRow } from './components';

import {
  JoinBoardCheck,
  useBoardStore,
  usePresenceStore,
  useRoomStore,
  useUsersStore,
  useUser,
  usePluginStore,
  useConfigStore,
  useRouteNav,
  useHexColor,
  CreateRoomModal,
  CreateBoardModal,
  EnterBoardByIdModal,
  EditRoomModal,
  EditBoardModal,
  EnterBoardModal,
} from '@sage3/frontend';
import { Board, Presence, Room, User } from '@sage3/shared/types';
import { MdAdd, MdExitToApp, MdHome, MdPerson, MdSearch, MdStarOutline } from 'react-icons/md';
import { SAGE3Ability } from '@sage3/shared';
import { IoMdTime } from 'react-icons/io';
import { BoardPreview } from './components/BoardPreview';

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
  const userColor = useHexColor(user ? user.data.color : 'gray');
  const recentBoards = user && user.data.recentBoards ? user.data.recentBoards : [];

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

  // Toast to inform user that they are not a member of a room
  const toast = useToast();

  // Colors
  const tealValue = useColorModeValue('teal.400', 'teal.500');
  const teal = useHexColor(tealValue);
  const scrollBarValue = useColorModeValue('gray.300', '#666666');
  const scrollBarColor = useHexColor(scrollBarValue);
  const sidebarBackgroundValue = useColorModeValue('gray.100', '#303030');
  const sidebarBackgroundColor = useHexColor(sidebarBackgroundValue);
  const mainBackgroundValue = useColorModeValue('gray.50', '#222222');
  const mainBackgroundColor = useHexColor(mainBackgroundValue);
  const dividerValue = useColorModeValue('gray.300', '#666666');
  const dividerColor = useHexColor(dividerValue);
  const hightlightGrayValue = useColorModeValue('gray.200', '#444444');
  const hightlightGray = useHexColor(hightlightGrayValue);
  const { toggleColorMode, colorMode } = useColorMode();

  // Modals
  const { isOpen: createRoomModalIsOpen, onOpen: createRoomModalOnOpen, onClose: createRoomModalOnClose } = useDisclosure();
  const { isOpen: createBoardModalIsOpen, onOpen: createBoardModalOnOpen, onClose: createBoardModalOnClose } = useDisclosure();
  const { isOpen: enterBoardByIdModalIsOpen, onOpen: enterBoardByIdModalOnOpen, onClose: enterBoardByIdModalOnClose } = useDisclosure();
  const { isOpen: editRoomModalIsOpen, onOpen: editRoomModalOnOpen, onClose: editRoomModalOnClose } = useDisclosure();
  const { isOpen: editBoardModalIsOpen, onOpen: editBoardModalOnOpen, onClose: editBoardModalOnClose } = useDisclosure();
  const { isOpen: enterBoardModalIsOpen, onOpen: enterBoardModalOnOpen, onClose: enterBoardModalOnClose } = useDisclosure();

  // Permissions
  const canJoin = SAGE3Ability.canCurrentUser('join', 'roommembers');
  const canCreateRoom = SAGE3Ability.canCurrentUser('create', 'rooms');
  const canCreateBoards = SAGE3Ability.canCurrentUser('create', 'boards');

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
  const recentBoardsFilter = (board: Board): boolean => {
    return recentBoards.includes(board._id);
  };

  // Function to handle states for when a user clicks on create room
  const handleCreateRoomClick = () => {
    if (!canCreateRoom) {
      toast({
        title: 'You do not have permission to create rooms',
        status: 'error',
        duration: 2 * 1000,
        isClosable: true,
      });
    } else {
      createRoomModalOnOpen();
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

  return (
    // Main Container
    <Box display="flex" width="100%" height="100vh" alignItems="center" backgroundColor={mainBackgroundColor}>
      {/* Check if the user wanted to join a board through a URL */}
      <JoinBoardCheck />
      {/* Modal to create a room */}
      <CreateRoomModal isOpen={createRoomModalIsOpen} onClose={createRoomModalOnClose} />
      {/* Modal to create a board */}
      <CreateBoardModal isOpen={createBoardModalIsOpen} onClose={createBoardModalOnClose} roomId={selectedRoom ? selectedRoom._id : ''} />
      {/* Modal to enter a board */}
      <EnterBoardByIdModal isOpen={enterBoardByIdModalIsOpen} onClose={enterBoardByIdModalOnClose} onOpen={enterBoardByIdModalOnOpen} />
      {/* Modal to edit room */}
      {selectedRoom && (
        <EditRoomModal
          isOpen={editRoomModalIsOpen}
          onOpen={editRoomModalOnOpen}
          room={selectedRoom}
          onClose={editRoomModalOnClose}
        ></EditRoomModal>
      )}
      {/* Modal to edit board */}
      {selectedBoard && (
        <EditBoardModal
          isOpen={editBoardModalIsOpen}
          onOpen={editBoardModalOnOpen}
          onClose={editBoardModalOnClose}
          board={selectedBoard}
        ></EditBoardModal>
      )}

      {/* Enter board modal */}
      {selectedBoard && <EnterBoardModal board={selectedBoard} isOpen={enterBoardModalIsOpen} onClose={enterBoardModalOnClose} />}

      {/* Sidebar Drawer */}
      <Box
        backgroundColor={sidebarBackgroundColor}
        width="400px"
        minWidth="400px"
        transition="width 0.5s"
        height="100vh"
        display="flex"
        flexDirection="column"
        borderRight={`solid ${dividerColor} 1px`}
      >
        <>
          <Box px="4" py="2" borderBottom={`solid ${dividerColor} 1px`}>
            <Text fontSize="3xl" fontWeight="bold" whiteSpace={'nowrap'} textOverflow={'ellipsis'} overflow="hidden">
              {config.serverName}
            </Text>
          </Box>

          <Box
            display="flex"
            flexDirection="column"
            justifyItems="start"
            flex="1"
            overflowY="scroll"
            overflowX="hidden"
            css={{
              '&::-webkit-scrollbar': {
                background: 'transparent',
                width: '5px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: scrollBarColor,
                borderRadius: '48px',
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
                _hover={{ backgroundColor: teal, cursor: 'pointer' }}
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
                _hover={{ backgroundColor: teal, cursor: 'pointer' }}
                pl="2"
                onClick={handleCreateRoomClick}
              >
                <Icon as={MdAdd} fontSize="24px" mx="2" /> <Text fontSize="lg">Create Room</Text>
              </Box>
              <Accordion defaultIndex={[0]} allowMultiple>
                <AccordionItem border="none">
                  <AccordionButton _hover={{ backgroundColor: teal, cursor: 'pointer' }} transition={'all 0.5s'} pl="2">
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
                          backgroundColor={room._id === selectedRoom?._id ? hightlightGrayValue : ''}
                          _hover={{ backgroundColor: hightlightGray, cursor: 'pointer' }}
                          onClick={() => handleRoomClick(room)}
                        >
                          <Text fontSize="md">{room.data.name}</Text>
                        </Box>
                      ))}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
                <Box borderTop={`solid 1px ${dividerColor}`} my="2"></Box>

                <Box
                  h="40px"
                  display="flex"
                  justifyContent={'left'}
                  alignItems={'center'}
                  transition="all 0.5s"
                  _hover={{ backgroundColor: teal, cursor: 'pointer' }}
                  pl="2"
                  onClick={enterBoardByIdModalOnOpen}
                >
                  <Icon as={MdExitToApp} fontSize="24px" mx="2" /> <Text fontSize="lg">Enter Board by URL</Text>
                </Box>

                <AccordionItem border="none">
                  <AccordionButton _hover={{ backgroundColor: teal, cursor: 'pointer' }} pl="2">
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
                          backgroundColor={board._id === selectedBoard?._id ? hightlightGrayValue : ''}
                          _hover={{ backgroundColor: hightlightGrayValue, cursor: 'pointer' }}
                          onClick={() => handleBoardClick(board)}
                        >
                          <Text fontSize="md">{board.data.name}</Text>
                        </Box>
                      ))}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
                <AccordionItem border="none">
                  <AccordionButton pl="2" _hover={{ backgroundColor: teal, cursor: 'pointer' }}>
                    <Box display="flex" flex="1" alignItems="left">
                      <Icon as={IoMdTime} fontSize="24px" mx="2" /> <Text fontSize="md">Recent Boards</Text>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>

                  <AccordionPanel p={0}>
                    <VStack align="stretch" gap="0">
                      {boards.filter(recentBoardsFilter).map((board) => (
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="left"
                          transition="all 0.5s"
                          pl="48px"
                          height="28px"
                          backgroundColor={board._id === selectedBoard?._id ? hightlightGrayValue : ''}
                          onClick={() => handleBoardClick(board)}
                          _hover={{ backgroundColor: hightlightGrayValue, cursor: 'pointer' }}
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
            backgroundColor={userColor}
            height="40px"
            alignItems={'center'}
            width="100%"
            transition={'all 0.5s'}
            _hover={{ cursor: 'pointer' }}
            onClick={toggleColorMode}
          >
            <Icon as={MdPerson} fontSize="24px" mx="2" />{' '}
            <Text fontSize="md" fontWeight={'bold'}>
              Ryan Theriot
            </Text>
          </Box>
        </>
      </Box>
      {selectedRoom && (
        <Box
          display="flex"
          flex="1"
          flexDirection="column"
          backgroundColor={mainBackgroundColor}
          maxHeight="100vh"
          height="100vh"
          padding="8"
        >
          <Box width="100%" minHeight="200px">
            {/* Room Information */}

            <VStack alignItems={'start'} gap="0">
              <Text fontSize="4xl" fontWeight="bold">
                {selectedRoom.data.name}
              </Text>
              <Text fontSize="xl" fontWeight={'normal'}>
                {' '}
                {selectedRoom?.data.description}
              </Text>

              <Text>Created by {users.find((u) => u._id === selectedRoom.data.ownerId)?.data.name}</Text>

              <Text>Created on {new Date(selectedRoom._createdAt).toLocaleDateString()}</Text>
              <Box display="flex" my="2" gap="2">
                <Button colorScheme="teal" size="sm" width="120px" disabled={canCreateBoards} onClick={createBoardModalOnOpen}>
                  Create Board
                </Button>
                <Button
                  colorScheme="teal"
                  width="120px"
                  size="sm"
                  disabled={selectedRoom.data.ownerId !== user?._id}
                  onClick={editRoomModalOnOpen}
                >
                  Settings
                </Button>
                <Button colorScheme="red" size="sm" width="120px" onClick={editRoomModalOnOpen}>
                  Leave Room
                </Button>
              </Box>
            </VStack>
          </Box>

          <Box width="100%">
            <Tabs colorScheme="teal">
              <TabList>
                <Tab>Boards</Tab>
                <Tab>Members</Tab>
                <Tooltip label="Coming Soon" openDelay={200} hasArrow placement="top">
                  <Tab isDisabled={true}>Assets</Tab>
                </Tooltip>
                <Tooltip label="Coming Soon" openDelay={200} hasArrow placement="top">
                  <Tab isDisabled={true}>Chat</Tab>
                </Tooltip>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <Box display="flex" gap="4">
                    <VStack
                      gap={'2'}
                      width="400px"
                      overflowY="scroll"
                      css={{
                        '&::-webkit-scrollbar': {
                          background: 'transparent',
                          width: '5px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: 'gray',
                          borderRadius: '48px',
                        },
                      }}
                    >
                      {boards
                        .filter((board) => board.data.roomId === selectedRoom?._id)
                        .map((board) => (
                          <BoardRow
                            key={board._id}
                            board={board}
                            onClick={() => handleBoardClick(board)}
                            selected={selectedBoard ? selectedBoard._id === board._id : false}
                            usersPresent={presences.filter((p) => p.data.boardId === board._id).length}
                          />
                        ))}
                    </VStack>
                    <Box width="400px" minHeight="200px" px="2">
                      {selectedBoard && (
                        <VStack gap="0" align="stretch">
                          <Text fontSize="3xl" fontWeight="bold">
                            {selectedBoard.data.name}
                          </Text>
                          <Text fontSize="lg" fontWeight={'normal'}>
                            {selectedBoard?.data.description}
                          </Text>
                          <Text>Created by {users.find((u) => u._id === selectedRoom.data.ownerId)?.data.name}</Text>
                          <Text>Created on {new Date(selectedBoard._createdAt).toLocaleDateString()}</Text>
                          <Box mt="2" borderRadius="md">
                            <BoardPreview board={selectedBoard} width={360} height={200} />
                          </Box>
                          <Box display="flex" my="2" gap={2}>
                            <Button colorScheme="teal" size="sm" width="100px" onClick={enterBoardModalOnOpen}>
                              Enter Board
                            </Button>
                            <Button colorScheme="teal" size="sm" width="100px">
                              Copy Link
                            </Button>
                            <Button colorScheme="teal" size="sm" width="100px" onClick={editBoardModalOnOpen}>
                              Settings
                            </Button>
                          </Box>
                        </VStack>
                      )}
                    </Box>
                  </Box>
                </TabPanel>
                <TabPanel>
                  <Box
                    display="flex"
                    flexDir="column"
                    overflowY="scroll"
                    width="400px"
                    css={{
                      '&::-webkit-scrollbar': {
                        background: 'transparent',
                        width: '5px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'white',
                        borderRadius: '48px',
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
              </TabPanels>
            </Tabs>
          </Box>
        </Box>
      )}
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

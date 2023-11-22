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

// Icons
import { MdAdd, MdExitToApp, MdHome, MdSearch, MdStarOutline } from 'react-icons/md';
import { IoMdTime } from 'react-icons/io';

// Components
import { UserRow, BoardRow, RoomSearchModal, BoardPreview } from './components';

// SAGE Imports
import { SAGE3Ability } from '@sage3/shared';
import { Board, Room, User } from '@sage3/shared/types';
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
  EnterBoardByURLModal,
  EditRoomModal,
  EditBoardModal,
  EnterBoardModal,
  ConfirmModal,
  MainButton,
  copyBoardUrlToClipboard,
} from '@sage3/frontend';

/**
 * Home page for SAGE3
 * Displays all the rooms and boards that the user has access to
 * Users can create rooms and board and join other rooms as members
 * @returns JSX.Element
 */
export function HomePage() {
  // URL Params
  const { roomId, boardId } = useParams();
  const { toHome } = useRouteNav();

  // Configuration information
  const config = useConfigStore((state) => state.config);

  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // User Information
  const { user, clearRecentBoards } = useUser();
  const userId = user ? user._id : '';
  const userColor = useHexColor(user ? user.data.color : 'gray');
  const recentBoards = user && user.data.recentBoards ? user.data.recentBoards : [];
  const savedBoards = user && user.data.savedBoards ? user.data.savedBoards : [];

  // Plugin Store
  const subPlugins = usePluginStore((state) => state.subscribeToPlugins);

  // Room Store
  const {
    rooms,
    members,
    subscribeToAllRooms: subscribeToRooms,
    fetched: roomsFetched,
    leaveRoomMembership,
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

  // Modals Disclosures
  const { isOpen: createRoomModalIsOpen, onOpen: createRoomModalOnOpen, onClose: createRoomModalOnClose } = useDisclosure();
  const { isOpen: createBoardModalIsOpen, onOpen: createBoardModalOnOpen, onClose: createBoardModalOnClose } = useDisclosure();
  const { isOpen: enterBoardByURLModalIsOpen, onOpen: enterBoardByURLModalOnOpen, onClose: enterBoardByURLModalOnClose } = useDisclosure();
  const { isOpen: editRoomModalIsOpen, onOpen: editRoomModalOnOpen, onClose: editRoomModalOnClose } = useDisclosure();
  const { isOpen: editBoardModalIsOpen, onOpen: editBoardModalOnOpen, onClose: editBoardModalOnClose } = useDisclosure();
  const { isOpen: enterBoardModalIsOpen, onOpen: enterBoardModalOnOpen, onClose: enterBoardModalOnClose } = useDisclosure();
  const { isOpen: roomSearchModal, onOpen: roomSearchModalOnOpen, onClose: roomSearchModalOnClose } = useDisclosure();
  const { isOpen: leaveRoomModalIsOpen, onOpen: leaveRoomModalOnOpen, onClose: leaveRoomModalOnClose } = useDisclosure();
  const {
    isOpen: clearRecentBoardsModalIsOpen,
    onOpen: clearRecentBoardsModalOnOpen,
    onClose: clearRecentBoardsModalOnClose,
  } = useDisclosure();

  // Permissions
  const canJoin = SAGE3Ability.canCurrentUser('join', 'roommembers');
  const canCreateRoom = SAGE3Ability.canCurrentUser('create', 'rooms');
  const canCreateBoards = SAGE3Ability.canCurrentUser('create', 'boards');

  // Filter Functions
  const roomMemberFilter = (room: Room): boolean => {
    if (!user) return false;
    const roomMembership = members.find((m) => m.data.roomId === room._id);
    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
    const isOwner = room.data.ownerId === userId;
    return isMember || isOwner;
  };
  const boardStarredFilter = (board: Board): boolean => {
    const isSaved = savedBoards.includes(board._id);
    const roomMembership = members.find((m) => m.data.roomId === board.data.roomId);
    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
    return isSaved && isMember;
  };

  const recentBoardsFilter = (board: Board): boolean => {
    const isRecent = recentBoards.includes(board._id);
    const roomMembership = members.find((m) => m.data.roomId === board.data.roomId);
    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
    return isRecent && isMember;
  };

  const membersFilter = (user: User): boolean => {
    if (!selectedRoom) return false;
    const roomMembership = members.find((m) => m.data.roomId === selectedRoom._id);
    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(user._id) : false;
    return isMember;
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
      updatePresence(userId, { roomId });
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

  // Copy a sharable link to the user's os clipboard
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Check if there is a selected board
    if (!selectedBoard) {
      toast({
        title: 'No board selected',
        description: 'Please select a board to copy a link to',
        duration: 3000,
        isClosable: true,
        status: 'error',
      });
      return;
    } else {
      const roomId = selectedBoard.data.roomId;
      const boardId = selectedBoard._id;
      // make it a sage3:// protocol link
      copyBoardUrlToClipboard(roomId, boardId);
      toast({
        title: 'Success',
        description: `Sharable Board link copied to clipboard.`,
        duration: 3000,
        isClosable: true,
        status: 'success',
      });
    }
  };

  // Handle when the user wnats to leave a room membership
  const handleLeaveRoomMembership = () => {
    const isOwner = selectedRoom?.data.ownerId === userId;
    if (selectedRoom && !isOwner) {
      leaveRoomMembership(selectedRoom._id);
      handleLeaveRoom();
      leaveRoomModalOnClose();
    }
  };

  // Handle when the user wants to clear his recent boards
  const handleClearRecentBoards = () => {
    if (clearRecentBoards) {
      clearRecentBoards();
    }
    clearRecentBoardsModalOnClose();
  };

  // Function to handle states for when a user leaves a room (unjoins)
  function handleLeaveRoom() {
    setSelectedRoom(undefined);
    setSelectedBoard(undefined);
    setSelectedUser(undefined);
  }

  // Function to handle when a use clicks on the room search button
  function handleRoomSearchClick() {
    if (canJoin) {
      roomSearchModalOnOpen();
    } else {
      toast({
        title: 'You do not have permission to join rooms',
        status: 'error',
        duration: 2 * 1000,
        isClosable: true,
      });
    }
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
      <EnterBoardByURLModal isOpen={enterBoardByURLModalIsOpen} onClose={enterBoardByURLModalOnClose} onOpen={enterBoardByURLModalOnOpen} />
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

      {/* Room Search Modal */}
      <RoomSearchModal isOpen={roomSearchModal} onClose={roomSearchModalOnClose} />

      {/* Confirmation Dialog to leave a room */}
      <ConfirmModal
        isOpen={leaveRoomModalIsOpen}
        onClose={leaveRoomModalOnClose}
        title={'Leave Room'}
        cancelText={'Cancel'}
        confirmText="Leave Room"
        confirmColor="red"
        message={`Are you sure you want to leave "${selectedRoom?.data.name}"?`}
        onConfirm={handleLeaveRoomMembership}
      />

      {/* Confirmation Dialog to clear recent boards */}
      <ConfirmModal
        isOpen={clearRecentBoardsModalIsOpen}
        onClose={clearRecentBoardsModalOnClose}
        title={'Clear Recent Boards'}
        cancelText={'Cancel'}
        confirmText="Clear"
        confirmColor="red"
        message={`Are you sure you want to clear your recent boards?`}
        onConfirm={handleClearRecentBoards}
      />

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
          <Box px="4" py="2" borderBottom={`solid ${dividerColor} 1px`} whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
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
                onClick={handleRoomSearchClick}
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
                      {rooms
                        .filter(roomMemberFilter)
                        .sort((a, b) => a.data.name.localeCompare(b.data.name))
                        .map((room) => (
                          <Box
                            key={room._id}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            transition="all 0.5s"
                            pl="48px"
                            height="28px"
                            backgroundColor={room._id === selectedRoom?._id ? hightlightGrayValue : ''}
                            _hover={{ backgroundColor: hightlightGray, cursor: 'pointer' }}
                            onClick={() => handleRoomClick(room)}
                          >
                            <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" mr="5">
                              <Text fontSize="md">{room.data.name}</Text>
                            </Box>

                            <Text fontSize="xs" pr="4">
                              {room.data.ownerId === userId ? 'Owner' : ''}
                            </Text>
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
                  onClick={enterBoardByURLModalOnOpen}
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
                      {boards
                        .filter(boardStarredFilter)
                        .sort((a, b) => a.data.name.localeCompare(b.data.name))
                        .map((board) => (
                          <Box
                            key={board._id}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            transition="all 0.5s"
                            pl="48px"
                            height="28px"
                            backgroundColor={board._id === selectedBoard?._id ? hightlightGrayValue : ''}
                            _hover={{ backgroundColor: hightlightGrayValue, cursor: 'pointer' }}
                            onClick={() => handleBoardClick(board)}
                          >
                            <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" mr="5">
                              <Text fontSize="md">{board.data.name}</Text>
                            </Box>
                            <Box pr="5">
                              <Text fontSize="sm">{presences.filter((p) => p.data.boardId === board._id).length}</Text>
                            </Box>
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
                          key={board._id}
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          transition="all 0.5s"
                          pl="48px"
                          height="28px"
                          backgroundColor={board._id === selectedBoard?._id ? hightlightGrayValue : ''}
                          onClick={() => handleBoardClick(board)}
                          _hover={{ backgroundColor: hightlightGrayValue, cursor: 'pointer' }}
                        >
                          <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" mr="5">
                            <Text fontSize="md">{board.data.name}</Text>
                          </Box>
                          <Box pr="5">
                            <Text fontSize="sm">{presences.filter((p) => p.data.boardId === board._id).length}</Text>
                          </Box>
                        </Box>
                      ))}
                      {boards.filter(recentBoardsFilter).length > 0 && (
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="left"
                          transition="all 0.5s"
                          pl="48px"
                          height="28px"
                          color="red.400"
                          fontWeight={'bold'}
                          onClick={clearRecentBoardsModalOnOpen}
                          _hover={{ backgroundColor: hightlightGrayValue, cursor: 'pointer' }}
                        >
                          <Text fontSize="md">Clear Recents Boards</Text>
                        </Box>
                      )}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </VStack>
          </Box>
          <MainButton config={config}></MainButton>
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
          overflow="hidden"
          padding="8"
        >
          <Box width="100%" minHeight="200px">
            {/* Room Information */}

            <VStack alignItems={'start'} gap="0">
              <Text fontSize="4xl" fontWeight="bold">
                {selectedRoom.data.name}
              </Text>
              <Text fontSize="xl" fontWeight={'normal'}>
                {selectedRoom?.data.description}
              </Text>

              <Text>Created by {users.find((u) => u._id === selectedRoom.data.ownerId)?.data.name}</Text>

              <Text>Created on {new Date(selectedRoom._createdAt).toLocaleDateString()}</Text>
              <Box display="flex" my="2" gap="2">
                <Button
                  colorScheme="teal"
                  variant="outline"
                  size="sm"
                  width="120px"
                  isDisabled={!canCreateBoards}
                  onClick={createBoardModalOnOpen}
                >
                  Create Board
                </Button>
                <Tooltip
                  label={
                    selectedRoom.data.ownerId === userId ? `Update the room's settings` : 'Only the owner can update the room settings'
                  }
                  openDelay={200}
                  hasArrow
                  placement="top"
                >
                  <Button
                    colorScheme="teal"
                    variant="outline"
                    width="120px"
                    size="sm"
                    isDisabled={selectedRoom.data.ownerId !== userId}
                    onClick={editRoomModalOnOpen}
                  >
                    Settings
                  </Button>
                </Tooltip>
                <Tooltip
                  label={selectedRoom.data.ownerId === userId ? 'You cannot leave this room since you are the owner' : 'Leave the room'}
                  openDelay={200}
                  hasArrow
                  placement="top"
                >
                  <Button
                    colorScheme="red"
                    variant="outline"
                    size="sm"
                    width="120px"
                    onClick={leaveRoomModalOnOpen}
                    isDisabled={selectedRoom.data.ownerId === userId}
                  >
                    Leave Room
                  </Button>
                </Tooltip>
              </Box>
            </VStack>
          </Box>

          <Box width="100%" overflow="hidden">
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
                  <Box display="flex" gap="4" overflow="hidden">
                    <VStack
                      gap="3"
                      pr="2"
                      style={{ height: 'calc(100vh - 340px)' }}
                      overflowY="scroll"
                      minWidth="375px"
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
                      {boards
                        .filter((board) => board.data.roomId === selectedRoom?._id)
                        .sort((a, b) => a.data.name.localeCompare(b.data.name))
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
                    <Box width="800px" minHeight="200px" px="2">
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
                            <BoardPreview board={selectedBoard} width={316} height={177} />
                          </Box>
                          <Box display="flex" my="2" gap={2}>
                            <Button
                              colorScheme={selectedBoard.data.color}
                              variant="outline"
                              size="sm"
                              width="100px"
                              onClick={enterBoardModalOnOpen}
                            >
                              Enter Board
                            </Button>
                            <Button
                              colorScheme={selectedBoard.data.color}
                              variant="outline"
                              size="sm"
                              width="100px"
                              onClick={handleCopyLink}
                            >
                              Copy Link
                            </Button>
                            <Button
                              colorScheme={selectedBoard.data.color}
                              variant="outline"
                              size="sm"
                              width="100px"
                              onClick={editBoardModalOnOpen}
                              isDisabled={selectedBoard.data.ownerId !== userId}
                            >
                              Settings
                            </Button>
                          </Box>
                        </VStack>
                      )}
                    </Box>
                  </Box>
                </TabPanel>
                <TabPanel>
                  <Box display="flex" width="800px">
                    <VStack
                      gap="3"
                      pr="2"
                      style={{ height: 'calc(100vh - 340px)' }}
                      overflowY="scroll"
                      alignContent="left"
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
                      {users.filter(membersFilter).map((user) => {
                        return <UserRow key={user._id} user={user} />;
                      })}
                    </VStack>
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

/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React Imports
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

// Chakra Iports
import {
  Box,
  useColorModeValue,
  Text,
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
  Tooltip,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Link,
  useMediaQuery,
  Input,
  InputGroup,
  InputLeftElement,
  Flex,
  IconButton,
  ButtonGroup,
  HStack,
  Grid,
  GridItem,
} from '@chakra-ui/react';

// Joyride UI Explainer
import Joyride, { ACTIONS, CallBackProps, EVENTS, STATUS, Step } from 'react-joyride';

// Icons
import { MdAdd, MdExitToApp, MdHome, MdPerson, MdSearch, MdStarOutline, MdGridView, MdList } from 'react-icons/md';
import { IoMdTime } from 'react-icons/io';
import { BiChevronDown } from 'react-icons/bi';

// SAGE Imports
import { SAGE3Ability, generateReadableID, fuzzySearch } from '@sage3/shared';
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
  Clock,
  isElectron,
  useUserSettings,
} from '@sage3/frontend';

// Home Page Components
import { UserRow, BoardRow, BoardCard, RoomSearchModal, BoardSidebarRow } from './components';
import { getSvgPathFromPoints } from 'tldraw';
import QuickAccessPage from './components/quick-access/QuickAccessPage';

/**
 * Home page for SAGE3
 * Displays all the rooms and boards that the user has access to
 * Users can create rooms and board and join other rooms as members
 * @returns JSX.Element
 */
export function NewHomePage() {
  // Media Query
  const [isLargerThan800] = useMediaQuery('(min-width: 800px)');

  const { toHome, toQuickAccess } = useRouteNav();

  // Configuration information
  const config = useConfigStore((state) => state.config);

  // Electron
  const electron = isElectron();
  const [servers, setServers] = useState<{ name: string; id: string; url: string }[]>([]);

  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // User Information
  const { user, clearRecentBoards } = useUser();
  const userId = user ? user._id : '';
  // const userColor = useHexColor(user ? user.data.color : 'gray');
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
    joinRoomMembership,
  } = useRoomStore((state) => state);

  // Board Store
  const { boards, subscribeToAllBoards: subscribeToBoards, update: updateBoard } = useBoardStore((state) => state);

  // User and Presence Store
  const { users, subscribeToUsers } = useUsersStore((state) => state);
  const { update: updatePresence, subscribe: subscribeToPresence, presences } = usePresenceStore((state) => state);

  // Settings
  const { setBoardListView, settings } = useUserSettings();
  const boardListView = settings.selectedBoardListView;

  // User Selected Room, Board, and User
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [boardSearch, setBoardSearch] = useState<string>('');
  const [selectedQuickAccess, setSelectedQuickAccess] = useState<'active' | 'starred' | 'recent' | undefined>(undefined);

  // Selected Board Ref
  const scrollToBoardRef = useRef<null | HTMLDivElement>(null);

  // Toast to inform user that they are not a member of a room
  const toast = useToast();

  // Colors
  const tealValue = useColorModeValue('teal.400', 'teal.500');
  const teal = useHexColor(tealValue);
  const scrollBarValue = useColorModeValue('gray.300', '#666666');
  const scrollBarColor = useHexColor(scrollBarValue);
  const sidebarBackgroundValue = useColorModeValue('gray.50', '#303030');
  const sidebarBackgroundColor = useHexColor(sidebarBackgroundValue);
  const mainBackgroundValue = useColorModeValue('gray.100', '#222222');
  const mainBackgroundColor = useHexColor(mainBackgroundValue);
  const dividerValue = useColorModeValue('gray.300', '#666666');
  const dividerColor = useHexColor(dividerValue);
  const hightlightGrayValue = useColorModeValue('gray.200', '#444444');
  const hightlightGray = useHexColor(hightlightGrayValue);
  const subTextValue = useColorModeValue('gray.700', 'gray.300');
  const subTextColor = useHexColor(subTextValue);
  const homeSectionValue = useColorModeValue('gray.100', '#393939');
  const homeSectionColor = useHexColor(homeSectionValue);
  // const { toggleColorMode, colorMode } = useColorMode();

  // Styling
  const buttonRadius = 'xl';
  const cardRadius = 'xl';

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

  // Joyride State
  const [joyrideSteps, setJoyrideSteps] = useState<Step[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [runJoyride, setRunJoyride] = useState(true);

  // Joyride Refs
  const introRef = useRef<HTMLDivElement>(null);
  const mainButtonRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  const serverNameRef = useRef<HTMLDivElement>(null);
  const createRoomRef = useRef<HTMLDivElement>(null);
  const searchRoomsRef = useRef<HTMLDivElement>(null);
  const enterBoardByURLRef = useRef<HTMLDivElement>(null);
  const roomsRef = useRef<HTMLDivElement>(null);
  const activeBoardsRef = useRef<HTMLDivElement>(null);
  const starredBoardsRef = useRef<HTMLDivElement>(null);
  const recentBoardsRef = useRef<HTMLDivElement>(null);
  const joyrideRef = useRef<Joyride>(null);

  // Joyride Callback Handler
  // This is where we can control what happens after each step
  // It is required because we have the HELP Button in the upper right
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;
    // Check if already done
    const already = localStorage.getItem('s3_intro_done');
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || already === 'true') {
      // Need to set our running state to false, so we can restart if we click start again.
      setRunJoyride(false);
      setStepIndex(0);
      localStorage.setItem('s3_intro_done', 'true');
    }

    if (action === ACTIONS.CLOSE) {
      // Need to set our running state to false, so we can restart if we click start again.
      setRunJoyride(false);
      setStepIndex(0);
      localStorage.setItem('s3_intro_done', 'true');
    }

    if (action === ACTIONS.NEXT && type === EVENTS.STEP_AFTER) {
      setStepIndex(stepIndex + 1);
    }

    if (action === ACTIONS.PREV && type === EVENTS.STEP_AFTER) {
      setStepIndex(stepIndex - 1);
    }
  };

  // The actual steps for the joyride
  const handleSetJoyrideSteps = () => {
    setJoyrideSteps([
      {
        target: introRef.current!,
        title: 'Welcome to SAGE3',
        content:
          'We recently updated our design to make it easier to use. This is a quick tour of the new UI. Please click next to continue.',
        disableBeacon: true,
        disableOverlayClose: true,
        placement: 'center',
      },
      {
        target: mainButtonRef.current!,
        title: 'Main Menu',
        content: 'This is the Main Menu Button. From here, you can update your profile, change theme, find users, and logout.',
        disableBeacon: true,
      },
      {
        target: serverNameRef.current!,
        title: electron ? 'Servers' : 'Server',
        content: electron
          ? 'This shows the current SAGE3 server. You can change servers by clicking on the server name.'
          : 'This shows the current SAGE3 server.',
        disableBeacon: true,
      },
      {
        target: createRoomRef.current!,
        title: 'Create Rooms',
        content: 'This button will allow you to create new rooms. After creating a room, you can add new boards and start collaborating.',
        disableBeacon: true,
      },
      {
        target: searchRoomsRef.current!,
        title: 'Search for Rooms',
        content: 'You can search for existing public rooms and join them from here.',
        disableBeacon: true,
      },
      {
        target: enterBoardByURLRef.current!,
        title: 'Enter a Board by URL',
        content: 'Other users can share a link to a board with you. You enter the board by clicking this button and pasting the link.',
        disableBeacon: true,
      },
      {
        target: roomsRef.current!,
        title: 'Your Rooms',
        content:
          'Rooms you are the owner of or a member of will appear here. Click a name to enter the room. If you dont have any room listed, you can create a new one or search for existing ones above.',
        disableBeacon: true,
      },
      {
        target: activeBoardsRef.current!,
        title: 'Active Boards',
        content: 'Boards with active users on them will appear here.',
        disableBeacon: true,
      },
      {
        target: starredBoardsRef.current!,
        title: 'Starred Boards',
        content:
          'You can star your frequently used boards here for quick access. You can star a board by clicking on the star icon next to the boards name once you enter a room.',
        disableBeacon: true,
      },
      {
        target: recentBoardsRef.current!,
        title: 'Recent Boards',
        content:
          'Boards you have recently visited will appear here. You can clear this list by clicking on the "Clear Recent Boards" button. The list is limited to 10 boards.',
      },
      {
        target: clockRef.current!,
        title: 'Clock and more',
        content:
          'Your local time is displayed here, with the help button. While in a board, it also displays performance and network status, help, search and settings buttons.',
      },
      {
        target: introRef.current!,
        title: 'End of the Tour',
        content: (
          <>
            <Text py={2}>We hope you enjoy using SAGE3!</Text>
            <Text>
              Join us on the SAGE3 Discord server:
              <Link href="https://discord.gg/hHsKu47buY" color="teal.500" isExternal>
                https://discord.gg/hHsKu47buY
              </Link>
            </Text>
          </>
        ),
        disableBeacon: true,
        disableOverlayClose: true,
        placement: 'center',
      },
    ]);
  };

  // Handle when the user clicks on the help button to restart Joyride
  const handleHomeHelpClick = () => {
    setStepIndex(0);
    setRunJoyride(true);
    localStorage.setItem('s3_intro_done', 'false');
  };

  const handleBoardDoubleClick = (board: Board) => {
    setSelectedBoard(board);
    enterBoardModalOnOpen();
  };

  // Load the steps when the component mounts
  useEffect(() => {
    handleSetJoyrideSteps();
  }, []);

  // Filter Functions
  const roomMemberFilter = (room: Room): boolean => {
    if (!user) return false;
    const roomMembership = members.find((m) => m.data.roomId === room._id);
    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
    const isOwner = room.data.ownerId === userId;
    const isMainRoom = room.data.name === 'Main Room' && room.data.ownerId === '';
    return isMember || isOwner;
  };

  const boardActiveFilter = (board: Board): boolean => {
    const roomMembership = members.find((m) => m.data.roomId === board.data.roomId);
    const userCount = presences.filter((p) => p.data.boardId === board._id).length;

    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
    return isMember && userCount > 0;
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

  const boardSearchFilter = (board: Board) => {
    return fuzzySearch(board.data.name + ' ' + board.data.description, boardSearch);
  };

  // Check to see if the user is the owner but not a member in weird cases
  useEffect(() => {
    if (roomsFetched) {
      rooms.forEach((room) => {
        const roomMembership = members.find((m) => m.data.roomId === room._id);
        const isOwner = room.data.ownerId === userId;

        // If the user is the owner and room has no member yet, join the room
        if (isOwner && !roomMembership) {
          joinRoomMembership(room._id);
        }

        // Is the user a member but just hasn't joined yet?
        const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
        if (isOwner && !isMember) {
          joinRoomMembership(room._id);
        }
      });
    }
  }, [roomsFetched]);

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

  const getBookmarks = () => {
    window.electron.on('get-servers-response', async (servers: any) => {
      setServers(servers);
    });
    window.electron.send('get-servers-request');
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

    if (electron) {
      getBookmarks();
    }
  }, []);

  // Change of room
  useEffect(() => {
    if (user) {
      const roomId = selectedRoom ? selectedRoom._id : '';
      updatePresence(userId, { roomId });
    }
    setBoardSearch('');
  }, [selectedRoom]);

  // Scroll selected board into view
  useEffect(() => {
    if (scrollToBoardRef?.current) {
      const rect = scrollToBoardRef.current.getBoundingClientRect();
      if (!(rect.top >= 350 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) - 50)) {
        scrollToBoardRef.current.scrollIntoView({
          behavior: 'smooth',
          block: rect.top < 350 ? 'start' : 'end',
        });
      }
    }
  }, [scrollToBoardRef?.current]);

  // Function to handle states for when a user clicks on a room
  function handleRoomClick(room: Room | undefined) {
    if (room) {
      // If the room is already selected, deselect it
      room._id == selectedRoom?._id ? setSelectedRoom(undefined) : setSelectedRoom(room);
      setSelectedQuickAccess(undefined);
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

      // Fixing data model: adding the board code
      if (!board.data.code) {
        const newCode = generateReadableID();
        updateBoard(board._id, { code: newCode });
      }
    } else {
      setSelectedBoard(undefined);
      setSelectedUser(undefined);
    }
  }

  function handleQuickAccessClick(quickAccess: 'active' | 'starred' | 'recent') {
    if (quickAccess !== selectedQuickAccess) {
      setSelectedRoom(undefined);
      setSelectedQuickAccess(quickAccess);
      toQuickAccess(quickAccess);
    } else {
      setSelectedRoom(undefined);
      setSelectedQuickAccess(undefined);
      toHome();
    }
    console.log('quickAccess', quickAccess);
  }

  // Clear the filters only when selecting from navigation sidebar
  function handleBoardClickFromSubMenu(board: Board) {
    setBoardSearch('');
    handleBoardClick(board);
  }

  // Handle when the user wnats to leave a room membership
  const handleLeaveRoomMembership = () => {
    const isOwner = selectedRoom?.data.ownerId === userId;
    if (selectedRoom && !isOwner) {
      leaveRoomMembership(selectedRoom._id);
      handleLeaveRoom();
      leaveRoomModalOnClose();
    }
  };

  // Handle Join room membership
  const handleJoinRoomMembership = (room: Room) => {
    if (canJoin) {
      joinRoomMembership(room._id);
      toast({
        title: `You have successfully joined ${room.data.name}`,
        status: 'success',
        duration: 4 * 1000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'You do not have permission to join rooms',
        status: 'error',
        duration: 2 * 1000,
        isClosable: true,
      });
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

  // Function to get the greeting based on the time of the day
  function getTimeBasedGreeting() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 18) {
      return 'afternoon';
    } else {
      return 'evening';
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

  console.log(
    boards
      .filter(boardActiveFilter)
      .sort((a, b) => a.data.name.localeCompare(b.data.name))
      .sort((a, b) => {
        // Sorted by alpha then user count
        const userCountA = presences.filter((p) => p.data.boardId === a._id).length;
        const userCountB = presences.filter((p) => p.data.boardId === b._id).length;
        return userCountB - userCountA;
      })
      .map((board) => {
        return board.data.name, board.data.roomId;
      })
  );
  return (
    // Main Container
    <Box display="flex" width="100svw" height="100svh" alignItems="center" p="3" backgroundColor={mainBackgroundColor} ref={introRef}>
      {/* Joyride */}
      <Joyride
        ref={joyrideRef}
        steps={joyrideSteps}
        run={runJoyride}
        callback={handleJoyrideCallback}
        continuous
        showProgress
        stepIndex={stepIndex}
        styles={{
          options: {
            primaryColor: teal,
            width: 400,
            zIndex: 1000,
          },
        }}
      />
      {/* Check if the user wanted to join a board through a URL / ID */}
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
        message={'Are you sure you want to clear your recent boards?'}
        onConfirm={handleClearRecentBoards}
      />

      {/* Sidebar Drawer */}
      <Box
        // backgroundColor={sidebarBackgroundColor}
        borderRadius={cardRadius}
        width="350px"
        minWidth="350px"
        transition="width 0.5s"
        height="100%"
        display="flex"
        flexDirection="column"
        // borderRight={`solid ${dividerColor} 1px`}
      >
        {/* Server selection and main actions */}
        <Box padding="2" borderRadius={cardRadius} background={sidebarBackgroundColor}>
          {servers.length > 0 ? (
            <Box ref={serverNameRef}>
              <Menu placement="bottom-end">
                <MenuButton
                  as={Box}
                  px="4"
                  py="2"
                  width="100%"
                  borderRadius={buttonRadius}
                  // borderBottom={`solid ${dividerColor} 1px`}
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  fontSize="3xl"
                  fontWeight={'bold'}
                  _hover={{ cursor: 'pointer', backgroundColor: teal }}
                >
                  <Box display="flex" justifyContent={'space-between'} alignContent={'center'}>
                    <Text fontSize="3xl" fontWeight="bold" whiteSpace={'nowrap'} textOverflow={'ellipsis'} overflow="hidden">
                      {config.serverName}
                    </Text>
                    <Box pt="2">
                      <BiChevronDown />
                    </Box>
                  </Box>
                </MenuButton>
                <MenuList width={'350px'}>
                  {servers.map((server) => {
                    return (
                      <MenuItem
                        key={server.id}
                        onClick={() => {
                          window.location.href = server.url;
                        }}
                      >
                        {server.name}
                      </MenuItem>
                    );
                  })}
                </MenuList>
              </Menu>
            </Box>
          ) : (
            <Box
              px="4"
              py="2"
              // borderBottom={`solid ${dividerColor} 1px`}
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
              ref={serverNameRef}
            >
              <Text fontSize="3xl" fontWeight="bold" whiteSpace={'nowrap'} textOverflow={'ellipsis'} overflow="hidden">
                {config.serverName}
              </Text>
            </Box>
          )}

          <Box pt="2" px="2">
            <Tooltip openDelay={400} hasArrow placement="top" label={'Navigate to home page.'}>
              <Box
                h="40px"
                display="flex"
                justifyContent={'left'}
                alignItems={'center'}
                transition="all 0.5s"
                borderRadius={buttonRadius}
                onClick={() => {
                  toHome();
                  handleLeaveRoom();
                  setSelectedQuickAccess(undefined);
                }}
                _hover={{ backgroundColor: teal, cursor: 'pointer' }}
                pl="2"
              >
                <Icon as={MdHome} fontSize="24px" mx="2" /> <Text fontSize="lg">Home</Text>
              </Box>
            </Tooltip>

            <Tooltip openDelay={400} hasArrow placement="top" label={'Search for public rooms on this server'}>
              <Box
                h="40px"
                display="flex"
                justifyContent={'left'}
                alignItems={'center'}
                transition="all 0.5s"
                borderRadius={buttonRadius}
                _hover={{ backgroundColor: teal, cursor: 'pointer' }}
                pl="2"
                onClick={handleRoomSearchClick}
                ref={searchRoomsRef}
              >
                <Icon as={MdSearch} fontSize="24px" mx="2" /> <Text fontSize="lg">Search for Rooms</Text>
              </Box>
            </Tooltip>

            <Tooltip openDelay={400} hasArrow placement="top" label={'Enter a board using an ID or shared URL'}>
              <Box
                h="40px"
                display="flex"
                justifyContent={'left'}
                alignItems={'center'}
                transition="all 0.5s"
                _hover={{ backgroundColor: teal, cursor: 'pointer' }}
                pl="2"
                borderRadius={buttonRadius}
                onClick={enterBoardByURLModalOnOpen}
                ref={enterBoardByURLRef}
              >
                <Icon as={MdExitToApp} fontSize="24px" mx="2" /> <Text fontSize="lg">Join Board</Text>
              </Box>
            </Tooltip>
          </Box>
        </Box>

        {/* Rooms and boards section */}
        <Box backgroundColor={sidebarBackgroundColor} borderRadius={cardRadius} my="3" overflow="hidden" height="100%" pt="5" pb="5">
          <Box
            display="flex"
            flexDirection="column"
            justifyItems="start"
            flex="1"
            height="100%"
            overflowY="auto"
            overflowX="hidden"
            px="3"
            // backgroundColor={sidebarBackgroundColor}
            borderRadius={cardRadius}
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
                display="flex"
                flex="1"
                alignItems="left"
                transition="all 0.5s"
                borderRadius={buttonRadius}
                bg={selectedQuickAccess === 'active' ? hightlightGray : ''}
                _hover={{ backgroundColor: hightlightGray, cursor: 'pointer' }}
                onClick={() => {
                  handleQuickAccessClick('active');
                }}
                p="2"
              >
                <Icon as={MdPerson} fontSize="24px" mx="2" /> <Text fontSize="md">Active Boards</Text>
              </Box>
              <Box
                display="flex"
                flex="1"
                alignItems="left"
                borderRadius={buttonRadius}
                transition="all 0.5s"
                bg={selectedQuickAccess === 'starred' ? hightlightGray : ''}
                onClick={() => {
                  handleQuickAccessClick('starred');
                }}
                _hover={{ backgroundColor: hightlightGray, cursor: 'pointer' }}
                p="2"
              >
                <Icon as={MdStarOutline} fontSize="24px" mx="2" /> <Text fontSize="md">Starred Boards</Text>
              </Box>
              <Box
                display="flex"
                flex="1"
                alignItems="left"
                borderRadius={buttonRadius}
                transition="all 0.5s"
                bg={selectedQuickAccess === 'recent' ? hightlightGray : ''}
                _hover={{ backgroundColor: hightlightGray, cursor: 'pointer' }}
                onClick={() => {
                  handleQuickAccessClick('recent');
                }}
                p="2"
              >
                <Icon as={IoMdTime} fontSize="24px" mx="2" /> <Text fontSize="md">Recent Boards</Text>
              </Box>
              <Box mt="6" pl="2">
                <Box pl="2">Joined Rooms</Box>
                <Box>
                  {rooms
                    .filter(roomMemberFilter)
                    .sort((a, b) => a.data.name.localeCompare(b.data.name))
                    .map((room) => {
                      return (
                        <Tooltip
                          key={'tooltip_room' + room._id}
                          openDelay={400}
                          hasArrow
                          placement="top"
                          label={`Description ${room.data.description}`}
                        >
                          <Box
                            borderRadius="6"
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
                              <Text fontSize="md" pl="2">
                                {room.data.name}
                              </Text>
                            </Box>

                            <Text fontSize="xs" pr="4" color={subTextColor}>
                              {room.data.ownerId === userId ? 'Owner' : 'Member'}
                            </Text>
                          </Box>
                        </Tooltip>
                      );
                    })}
                </Box>
              </Box>
            </VStack>
          </Box>
        </Box>

        {/* Profile */}
        <Box ref={mainButtonRef}>
          <MainButton config={config}></MainButton>
        </Box>
      </Box>
      {selectedQuickAccess && (
        <Box
          display="flex"
          flex="1"
          flexDirection="column"
          backgroundColor={sidebarBackgroundColor}
          maxHeight="100svh"
          height="100%"
          borderRadius={cardRadius}
          marginLeft="3"
          // overflow="hidden"
          pt={4}
          pr={4}
          pb={4}
          pl={6}
        >
          {selectedQuickAccess === 'active' && (
            <QuickAccessPage
              title="Active Boards"
              icon={MdPerson}
              boardListView={boardListView}
              setBoardListView={setBoardListView}
              boardSearch={boardSearch}
              setBoardSearch={setBoardSearch}
              filteredBoards={boards
                .filter(boardActiveFilter)
                .filter(boardSearchFilter)
                .sort((a, b) => a.data.name.localeCompare(b.data.name))
                .sort((a, b) => {
                  // Sorted by alpha then user count
                  const userCountA = presences.filter((p) => p.data.boardId === a._id).length;
                  const userCountB = presences.filter((p) => p.data.boardId === b._id).length;
                  return userCountB - userCountA;
                })}
              handleBoardClick={handleBoardClick}
              selectedBoard={selectedBoard}
              presences={presences}
              scrollToBoardRef={scrollToBoardRef}
            />
          )}
          {selectedQuickAccess === 'starred' && (
            <QuickAccessPage
              title="Starred Boards"
              icon={MdStarOutline}
              boardListView={boardListView}
              setBoardListView={setBoardListView}
              boardSearch={boardSearch}
              setBoardSearch={setBoardSearch}
              filteredBoards={boards
                .filter(boardStarredFilter)
                .filter(boardSearchFilter)
                .sort((a, b) => a.data.name.localeCompare(b.data.name))}
              handleBoardClick={handleBoardClick}
              selectedBoard={selectedBoard}
              presences={presences}
              scrollToBoardRef={scrollToBoardRef}
            />
          )}
          {selectedQuickAccess === 'recent' && (
            <QuickAccessPage
              title="Recent Boards"
              icon={IoMdTime}
              boardListView={boardListView}
              setBoardListView={setBoardListView}
              boardSearch={boardSearch}
              setBoardSearch={setBoardSearch}
              filteredBoards={boards
                .filter(recentBoardsFilter)
                .filter(boardSearchFilter)
                .sort((a, b) => a.data.name.localeCompare(b.data.name))}
              handleBoardClick={handleBoardClick}
              selectedBoard={selectedBoard}
              presences={presences}
              scrollToBoardRef={scrollToBoardRef}
            />
          )}
        </Box>
      )}

      {/* Selected Room */}
      {selectedRoom && (
        <Box
          display="flex"
          flex="1"
          flexDirection="column"
          backgroundColor={sidebarBackgroundColor}
          maxHeight="100svh"
          height="100%"
          borderRadius={cardRadius}
          marginLeft="3"
          // overflow="hidden"
          pt={4}
          pr={4}
          pb={4}
          pl={6}
        >
          <Box width="100%" minHeight="170px" position="relative" top="-0.5rem">
            {/* Room Information */}
            <VStack alignItems={'start'} gap="0">
              <Text fontSize="3xl" fontWeight="bold">
                {selectedRoom.data.name}
              </Text>
              <Text fontSize="xl" fontWeight={'normal'}>
                {selectedRoom?.data.description}
              </Text>

              <Text color={subTextColor}>Created by {users.find((u) => u._id === selectedRoom.data.ownerId)?.data.name}</Text>

              <Text color={subTextColor}>Created on {new Date(selectedRoom._createdAt).toLocaleDateString()}</Text>
              <Box display="flex" my="2" gap="2">
                <Tooltip label={'Create a new board in this room'} openDelay={400} hasArrow placement="top">
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
                </Tooltip>
                <Tooltip
                  label={
                    selectedRoom.data.ownerId === userId ? `Update the room's settings` : 'Only the owner can update the room settings'
                  }
                  openDelay={400}
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
                  label={selectedRoom.data.ownerId === userId ? 'Owners cannot leave their own room.' : 'Leave this room'}
                  openDelay={400}
                  hasArrow
                  placement="top"
                >
                  <Button
                    colorScheme={rooms.filter(roomMemberFilter).includes(selectedRoom) ? 'red' : 'teal'}
                    variant="outline"
                    size="sm"
                    width="120px"
                    onClick={() => {
                      if (rooms.filter(roomMemberFilter).includes(selectedRoom)) {
                        leaveRoomModalOnOpen();
                      } else {
                        handleJoinRoomMembership(selectedRoom);
                      }
                    }}
                    isDisabled={selectedRoom.data.ownerId === userId}
                  >
                    {rooms.filter(roomMemberFilter).includes(selectedRoom) ? 'Unjoin' : 'Join'}
                  </Button>
                </Tooltip>
              </Box>
            </VStack>
          </Box>

          <Box width="100%" height="100%">
            <Tabs colorScheme="teal">
              <TabList>
                <Tab>Boards</Tab>
                <Tab>Members</Tab>
                <Tooltip label="Coming Soon" openDelay={400} hasArrow placement="top">
                  <Tab isDisabled={true}>Assets</Tab>
                </Tooltip>
                <Tooltip label="Coming Soon" openDelay={400} hasArrow placement="top">
                  <Tab isDisabled={true}>Chat</Tab>
                </Tooltip>
              </TabList>

              <TabPanels>
                <TabPanel px="0">
                  <Box display="flex" gap="4">
                    <Flex gap="4" flexDirection="column">
                      <Flex align="center" gap="2" justify="flex-start" mx="4">
                        <ButtonGroup size="md" isAttached variant="outline">
                          <IconButton
                            aria-label="Board List View"
                            colorScheme={boardListView === 'list' ? 'teal' : 'gray'}
                            onClick={() => {
                              setBoardListView('list');
                            }}
                            icon={<MdList />}
                          />
                          <IconButton
                            aria-label="Board Grid View"
                            colorScheme={boardListView === 'grid' ? 'teal' : 'gray'}
                            onClick={() => {
                              setBoardListView('grid');
                            }}
                            icon={<MdGridView />}
                          />
                        </ButtonGroup>

                        <InputGroup size="md" width="415px" my="1">
                          <InputLeftElement pointerEvents="none">
                            <MdSearch />
                          </InputLeftElement>
                          <Input placeholder="Search Boards" value={boardSearch} onChange={(e) => setBoardSearch(e.target.value)} />
                        </InputGroup>
                      </Flex>
                      {/* <Divider /> */}
                      {boardListView == 'grid' && (
                        <Flex
                          gap="4"
                          p="4"
                          display="flex"
                          flexWrap="wrap"
                          justifyContent="left"
                          style={{
                            maxHeight: 'calc(100vh - 360px)',
                            width: '100%',
                            maxWidth: '2200px',
                          }}
                          margin="0 auto"
                          overflowY="scroll"
                          overflowX="hidden"
                          pt="2"
                          minWidth="420px"
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
                            .filter((board) => boardSearchFilter(board))
                            .sort((a, b) => a.data.name.localeCompare(b.data.name))
                            .map((board) => (
                              <Box key={board._id} ref={board._id === selectedBoard?._id ? scrollToBoardRef : undefined}>
                                <BoardCard
                                  board={board}
                                  onClick={() => handleBoardClick(board)}
                                  // onClick={(board) => {handleBoardClick(board); enterBoardModalOnOpen()}}
                                  selected={selectedBoard ? selectedBoard._id === board._id : false}
                                  usersPresent={presences.filter((p) => p.data.boardId === board._id)}
                                />
                              </Box>
                            ))}
                        </Flex>
                      )}

                      {boardListView == 'list' && (
                        <VStack
                          gap="3"
                          alignItems="left"
                          pl="4"
                          style={{ height: 'calc(100svh - 360px)' }}
                          overflowY="scroll"
                          overflowX="hidden"
                          minWidth="420px"
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
                            .filter((board) => boardSearchFilter(board))
                            .sort((a, b) => a.data.name.localeCompare(b.data.name))
                            .map((board) => (
                              <Box key={board._id} ref={board._id === selectedBoard?._id ? scrollToBoardRef : undefined}>
                                <BoardRow
                                  key={board._id}
                                  board={board}
                                  onClick={() => handleBoardClick(board)}
                                  selected={selectedBoard ? selectedBoard._id === board._id : false}
                                  usersPresent={presences.filter((p) => p.data.boardId === board._id).length}
                                />
                              </Box>
                            ))}
                        </VStack>
                      )}
                    </Flex>
                  </Box>
                </TabPanel>
                <TabPanel px="0">
                  <Box display="flex" width="800px">
                    <VStack
                      gap="3"
                      pr="2"
                      style={{ height: 'calc(100svh - 340px)' }}
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

      {/* Home when room or quick access are not selected */}
      {!selectedRoom && !selectedQuickAccess && (
        <Box
          display="flex"
          flex="1"
          flexDirection="column"
          backgroundColor={sidebarBackgroundColor}
          maxHeight="100svh"
          height="100%"
          borderRadius={cardRadius}
          marginLeft="3"
          width="100%"
          overflow="hidden"
          py="6"
        >
          <Box
            display="flex"
            flexDir="column"
            overflow="auto"
            px="6"
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
            {/* The clock Top Right */}
            <Box ref={clockRef} w="full" ml="0">
              <Clock isBoard={false} homeHelpClick={handleHomeHelpClick} />
            </Box>
            <Text fontSize="xx-large" fontWeight="bold" alignSelf="center">
              Good {getTimeBasedGreeting()}, {user?.data.name.split(' ')[0]}
            </Text>
            {/* Recents and Starred Boards */}
            <Box borderRadius={cardRadius} py="3">
              <Text fontWeight="bold" mb="3">
                Recent Boards
              </Text>
              <Box background={homeSectionColor} borderRadius={cardRadius} px="3" overflow="hidden">
                {recentBoards.length > 0 ? (
                  <HStack
                    gap="3"
                    width="100%"
                    overflow="auto"
                    height="fit-content"
                    py="5"
                    px="2"
                    css={{
                      '&::-webkit-scrollbar': {
                        background: 'transparent',
                        height: '10px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: scrollBarColor,
                        borderRadius: '48px',
                      },
                    }}
                  >
                    {boards
                      .filter(recentBoardsFilter)
                      .sort((boardA, boardB) => {
                        // Sort by most recent
                        const indexOfA = recentBoards.indexOf(boardA._id);
                        const indexOfB = recentBoards.indexOf(boardB._id);
                        return indexOfA - indexOfB;
                      })
                      .map((board) => (
                        <Box key={board._id} ref={board._id === selectedBoard?._id ? scrollToBoardRef : undefined}>
                          <BoardCard
                            board={board}
                            onClick={() => handleBoardClick(board)}
                            // onClick={(board) => {handleBoardClick(board); enterBoardModalOnOpen()}}
                            selected={selectedBoard ? selectedBoard._id === board._id : false}
                            usersPresent={presences.filter((p) => p.data.boardId === board._id)}
                          />
                        </Box>
                      ))}
                  </HStack>
                ) : (
                  <Text p="3">No recent boards.</Text>
                )}
              </Box>

              <Box>
                <Text>Available Rooms</Text>
                <Button onClick={handleCreateRoomClick}>+ new</Button>
                <Box height="100%">
                  {rooms
                    .filter((room: Room) => room.data.isListed || (!room.data.isListed && room.data.ownerId === user?._id))
                    .sort((a, b) => a.data.name.localeCompare(b.data.name))
                    .map((room) => {
                      return (
                        <Tooltip
                          key={'tooltip_room' + room._id}
                          openDelay={400}
                          hasArrow
                          placement="top"
                          label={`Description ${room.data.description}`}
                        >
                          <Box
                            borderRadius="6"
                            key={room._id}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            transition="all 0.5s"
                            pl="48px"
                            height="28px"
                            _hover={{ backgroundColor: hightlightGray, cursor: 'pointer' }}
                            onClick={() => handleRoomClick(room)}
                          >
                            <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" mr="5">
                              <Text fontSize="md" pl="2">
                                {room.data.name}
                              </Text>
                            </Box>

                            <Text fontSize="xs" pr="4" color={subTextColor}>
                              {room.data.ownerId === userId ||
                              members.find((roomMember) => roomMember.data.roomId === room._id)?.data.members.includes(userId)
                                ? room.data.ownerId === userId
                                  ? 'Owner'
                                  : 'Member'
                                : 'Join'}
                            </Text>
                          </Box>
                        </Tooltip>
                      );
                    })}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

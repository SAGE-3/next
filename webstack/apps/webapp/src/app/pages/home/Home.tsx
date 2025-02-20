/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React Imports
import { useEffect, useMemo, useRef, useState } from 'react';
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
  Input,
  InputGroup,
  InputLeftElement,
  Flex,
  IconButton,
  ButtonGroup,
  HStack,
  Tag,
  Divider,
  useOutsideClick,
} from '@chakra-ui/react';

// Joyride UI Explainer
import Joyride, { ACTIONS, CallBackProps, EVENTS, STATUS, Step } from 'react-joyride';

// Icons
import { MdAdd, MdHome, MdSearch, MdGridView, MdList, MdLock, MdPeople, MdFolder, MdDashboard } from 'react-icons/md';
import { HiPuzzle } from 'react-icons/hi';
import { PiStackPlusFill } from 'react-icons/pi';
import { LuChevronsUpDown } from 'react-icons/lu';

// SAGE Imports
import { Board, Room } from '@sage3/shared/types';
import { SAGE3Ability, generateReadableID, fuzzySearch } from '@sage3/shared';
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
  Clock,
  isElectron,
  useUserSettings,
  useAssetStore,
  isUUIDv4,
} from '@sage3/frontend';

// Home Page Components
import { BoardRow, BoardCard, RoomSearchModal, PasswordJoinRoomModal, AssetList, PluginsList, MembersList } from './components';
import SearchRow from './components/search/SearchRow';
import { MainButton } from '../board/layers/ui/components';

/**
 * Home page for SAGE3
 * Displays all the rooms and boards that the user has access to
 * Users can create rooms and board and join other rooms as members
 * @returns JSX.Element
 */
export function HomePage() {
  const { toHome, toQuickAccess } = useRouteNav();
  const { roomId } = useParams();

  // Configuration information
  const config = useConfigStore((state) => state.config);

  // Electron
  const electron = isElectron();
  const [hubs, setHubs] = useState<{ name: string; id: string; url: string }[]>([]);

  // SAGE3 Image
  // const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // User Information
  const { user, clearRecentBoards } = useUser();
  const userId = user ? user._id : '';
  const recentBoards = user && user.data.recentBoards ? user.data.recentBoards : [];
  const savedBoards = user && user.data.savedBoards ? user.data.savedBoards : [];

  // Plugin Store
  const subPlugins = usePluginStore((state) => state.subscribeToPlugins);

  // Room Store
  const rooms = useRoomStore((state) => state.rooms);
  const members = useRoomStore((state) => state.members);
  const subscribeToRooms = useRoomStore((state) => state.subscribeToAllRooms);
  const roomsFetched = useRoomStore((state) => state.fetched);
  const leaveRoomMembership = useRoomStore((state) => state.leaveRoomMembership);
  const joinRoomMembership = useRoomStore((state) => state.joinRoomMembership);

  // Board Store
  const boards = useBoardStore((state) => state.boards);
  const subscribeToBoards = useBoardStore((state) => state.subscribeToAllBoards);
  const updateBoard = useBoardStore((state) => state.update);

  // User and Presence Store
  const users = useUsersStore((state) => state.users);
  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);

  // Assets Store
  const subcribeToAssets = useAssetStore((state) => state.subscribe);

  // Presence
  const partialPrescences = usePresenceStore((state) => state.partialPrescences);
  const updatePresence = usePresenceStore((state) => state.update);
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);

  // Settings
  const { setBoardListView, settings } = useUserSettings();
  const boardListView = settings.selectedBoardListView ? settings.selectedBoardListView : 'grid';

  // User Selected Room, Board, and User
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(undefined);
  const [boardSearch, setBoardSearch] = useState<string>('');
  const [roomSearch, setRoomSearch] = useState<string>('');
  const [selectedQuickAccess, setSelectedQuickAccess] = useState<'active' | 'starred' | 'recent' | undefined>(undefined);
  const [passwordProtectedRoom, setPasswordProtectedRoom] = useState<Room | undefined>(undefined);

  // Searchbar
  const [searchSage, setSearchSage] = useState<string>('');
  const [isSearchSageFocused, setSearchSageFocused] = useState<boolean>(false);

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
  const hightlightGrayValue = useColorModeValue('gray.200', '#444444');
  const hightlightGray = useHexColor(hightlightGrayValue);
  const subTextValue = useColorModeValue('gray.700', 'gray.300');
  const subTextColor = useHexColor(subTextValue);
  const homeSectionValue = useColorModeValue('gray.100', '#393939');
  const homeSectionColor = useHexColor(homeSectionValue);
  const availableRoomsBgColorValue = useColorModeValue('#ffffff', `gray.800`);
  const availableRoomsBgColor = useHexColor(availableRoomsBgColorValue);
  const tabColorValue = useColorModeValue('gray.300', 'gray.600');
  const tabColor = useHexColor(tabColorValue);
  const searchBarColorValue = useColorModeValue('gray.100', '#2c2c2c');
  const searchBarColor = useHexColor(searchBarColorValue);
  const searchPlaceholderColorValue = useColorModeValue('gray.400', 'gray.100');
  const searchPlaceholderColor = useHexColor(searchPlaceholderColorValue);

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
  const {
    isOpen: passwordJoinRoomModalIsOpen,
    onOpen: passwordJoinRoomModalOnOpen,
    onClose: passwordJoinRoomModalOnClose,
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
  const homeRef = useRef<HTMLDivElement>(null);
  const homeBtnRef = useRef<HTMLDivElement>(null);
  const mainButtonRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  const hubNameRef = useRef<HTMLDivElement>(null);
  const createRoomRef = useRef<HTMLButtonElement>(null);
  const searchSageRef = useRef<null | HTMLDivElement>(null);
  const searchInputRef = useRef<null | HTMLDivElement>(null);
  const enterBoardByURLRef = useRef<HTMLDivElement>(null);
  const roomsRef = useRef<HTMLDivElement>(null);
  const activeBoardsRef = useRef<HTMLButtonElement>(null);
  const starredBoardsRef = useRef<HTMLButtonElement>(null);
  const recentBoardsRef = useRef<HTMLButtonElement>(null);
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
    const userJoyrideSteps: Step[] = [
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
        target: homeRef.current!,
        title: 'Home',
        content: 'This is the Home Page. From here, you can access recent boards, create rooms, and search for rooms',
      },
      {
        target: mainButtonRef.current!,
        title: 'Main Menu',
        content: 'This is the Main Menu Button. From here, you can update your profile, change theme, find users, and logout.',
        disableBeacon: true,
      },
      {
        target: hubNameRef.current!,
        title: electron ? 'Hubs' : 'Hub',
        content: electron
          ? 'This shows the current SAGE3 Hub. You can change hubs by clicking on the hub name.'
          : 'This shows the current SAGE3 Hub.',
        disableBeacon: true,
      },
      {
        target: homeBtnRef.current!,
        title: 'Home Button',
        content: 'Clicking this button will take you back to the Home Page.',
      },
      {
        target: createRoomRef.current!,
        title: 'Create Rooms',
        content: 'This button will allow you to create new rooms. After creating a room, you can add new boards and start collaborating.',
        disableBeacon: true,
      },
      {
        target: searchInputRef.current!,
        title: 'Search your Rooms, Boards, and Join Boards via URL',
        content:
          'You can search for rooms that you own or join, and for boards from those rooms. Other users can share a link to a board with you. You enter the board by clicking this button and pasting the link.',
        disableBeacon: true,
      },
      {
        target: recentBoardsRef.current!,
        title: 'Recent Boards',
        content:
          'Boards you have recently visited will appear here. You can clear this list by clicking on the "Clear Recent Boards" button. The list is limited to 10 boards.',
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
        target: roomsRef.current!,
        title: 'Your Rooms',
        content:
          'Rooms you are the owner of or a member of will appear here. Click a name to enter the room. If you dont have any room listed, you can create a new one or search for existing ones above.',
        disableBeacon: true,
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
    ];

    const guestJoyrideSteps: Step[] = [
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
        target: homeRef.current!,
        title: 'Home',
        content: 'This is the Home Page. From here, you can access recent boards, create rooms, and search for rooms',
      },
      {
        target: mainButtonRef.current!,
        title: 'Main Menu',
        content: 'This is the Main Menu Button. From here, you can update your profile, change theme, find users, and logout.',
        disableBeacon: true,
      },
      {
        target: hubNameRef.current!,
        title: electron ? 'Hubs' : 'Hub',
        content: electron
          ? 'This shows the current SAGE3 Hub. You can change hubs by clicking on the hub name.'
          : 'This shows the current SAGE3 Hub.',
        disableBeacon: true,
      },
      {
        target: homeBtnRef.current!,
        title: 'Home Button',
        content: 'Clicking this button will take you back to the Home Page.',
      },
      {
        target: searchInputRef.current!,
        title: 'Search your Rooms, Boards, and Join Boards via URL',
        content:
          'You can search for rooms that you own or join, and for boards from those rooms. Other users can share a link to a board with you. You enter the board by clicking this button and pasting the link.',
        disableBeacon: true,
      },
      {
        target: recentBoardsRef.current!,
        title: 'Recent Boards',
        content:
          'Boards you have recently visited will appear here. You can clear this list by clicking on the "Clear Recent Boards" button. The list is limited to 10 boards.',
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
    ];

    setJoyrideSteps(user?.data.userRole === 'guest' || user?.data.userRole === 'spectator' ? guestJoyrideSteps : userJoyrideSteps);
  };

  // Handle when the user clicks on the help button to restart Joyride
  const handleHomeHelpClick = () => {
    setStepIndex(0);
    setRunJoyride(true);
    localStorage.setItem('s3_intro_done', 'false');
  };

  // Load the steps when room changes and component mounts
  useEffect(() => {
    handleSetJoyrideSteps();
  }, [roomId]);

  // Filter Functions
  const roomMemberFilter = (room: Room): boolean => {
    if (!user) return false;
    const roomMembership = members.find((m) => m.data.roomId === room._id);
    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
    const isOwner = room.data.ownerId === userId;
    // const isMainRoom = room.data.name === 'Main Room' && room.data.ownerId === '';
    return isMember || isOwner;
  };

  const boardActiveFilter = (board: Board): boolean => {
    const roomMembership = members.find((m) => m.data.roomId === board.data.roomId);
    const userCount = partialPrescences.filter((p) => p.data.boardId === board._id).length;

    // As a guest or spectator, check
    if (user?.data.userRole === 'guest' || user?.data.userRole === 'spectator') {
      const recentAndStarred = new Set([...recentBoards, ...savedBoards]);
      const isRecentOrStarred = recentAndStarred.has(board._id);
      return isRecentOrStarred && userCount > 0;
    }

    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
    return isMember && userCount > 0;
  };

  const boardStarredFilter = (board: Board): boolean => {
    const isSaved = savedBoards.includes(board._id);

    // As a guest or spectator, don't need to filter memberships. Just return cached boards.
    if (user?.data.userRole === 'guest' || user?.data.userRole === 'spectator') {
      return isSaved;
    }

    const roomMembership = members.find((m) => m.data.roomId === board.data.roomId);
    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
    return isSaved && isMember;
  };

  const recentBoardsFilter = (board: Board): boolean => {
    const isRecent = recentBoards.includes(board._id);

    // As a guest or spectator, don't need to filter memberships. Just return cached boards.
    if (user?.data.userRole === 'guest' || user?.data.userRole === 'spectator') {
      return isRecent;
    }

    const roomMembership = members.find((m) => m.data.roomId === board.data.roomId);
    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
    return isRecent && isMember;
  };

  const boardSearchFilter = (board: Board) => {
    return fuzzySearch(board.data.name + ' ' + board.data.description, boardSearch);
  };

  const roomSearchFilter = (room: Room) => {
    return fuzzySearch(room.data.name + ' ' + room.data.description, roomSearch);
  };

  const sageSearchFilter = (item: Board | Room) => {
    return fuzzySearch(item.data.name + '' + item.data.description, searchSage);
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

  const roomAndBoards = useMemo(() => {
    const filteredRooms = rooms.filter(roomMemberFilter);
    const filteredRoomsIdsAndNames: { [key: string]: string } = {};

    filteredRooms.forEach((room: Room) => {
      filteredRoomsIdsAndNames[`${room._id}`] = room.data.name;
    });

    const boardsInJoinedRooms = boards.filter((board: Board) => {
      return filteredRoomsIdsAndNames[`${board.data.roomId}`] !== undefined;
    });

    const roomsAssignedToBoards = boardsInJoinedRooms.map((board: Board) => ({
      ...board,
      roomName: filteredRoomsIdsAndNames[`${board.data.roomId}`],
    }));

    return [...filteredRooms, ...roomsAssignedToBoards];
  }, [rooms, boards]);

  useOutsideClick({
    ref: searchSageRef,
    handler: () => setSearchSageFocused(false),
  });

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
    window.electron.on('get-servers-response', async (hubs: any) => {
      setHubs(hubs);
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

    if (user) updatePresence(user?._id, { boardId: '', roomId: '' });

    // return to room from a board
    if (roomId && roomsFetched && user) {
      const room = rooms.find((r) => r._id === roomId);
      if (room) {
        subcribeToAssets(room._id);
        setSelectedRoom(room);
        setSelectedQuickAccess(undefined);
        setSelectedBoard(undefined);
      }
    }

    if (electron) {
      getBookmarks();
    }
  }, []);

  // Change of room
  useEffect(() => {
    if (user) {
      const roomId = selectedRoom ? selectedRoom._id : '';
      updatePresence(userId, { roomId });
      if (selectedRoom) {
        subcribeToAssets(selectedRoom._id);
      }
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

      // Fixing data model: adding the board code
      if (!board.data.code) {
        const newCode = generateReadableID();
        updateBoard(board._id, { code: newCode });
      }
    } else {
      setSelectedBoard(undefined);
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
      if (room.data.isPrivate) {
        setPasswordProtectedRoom(room);
      } else {
        joinRoomMembership(room._id);
        toast({
          title: `You have successfully joined ${room.data.name}`,
          status: 'success',
          duration: 4 * 1000,
          isClosable: true,
        });
      }
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

  // Function to check if it's a valid URL
  function isValidURL() {
    try {
      const SAGE_URL = searchSage.trim();
      const cleanURL = new URL(SAGE_URL.replace('sage3://', 'https://'));
      const hostname = cleanURL.hostname;
      const hash = cleanURL.hash;

      if (!hostname || !hash) {
        return false;
      }

      if (hostname !== window.location.hostname) {
        return true;
      }

      // Extract the boardID
      const boardId = hash.split('/')[hash.split('/').length - 1];
      if (!isUUIDv4(boardId)) {
        // Invalid URL
        return false;
      } else {
        const board = boards.find((board) => board._id === boardId);
        if (board) {
          return true;
        }
        return false;
      }
    } catch {
      return false;
    }
  }

  function extractUrlInfo(): { board: Board | null; isExternal: Boolean; error: Boolean; url: string | null } {
    const result: { board: Board | null; isExternal: Boolean; error: Boolean; url: string | null } = {
      board: null,
      isExternal: false,
      error: true,
      url: searchSage,
    };
    try {
      const SAGE_URL = searchSage.trim();
      const cleanURL = new URL(SAGE_URL.replace('sage3://', 'https://'));
      const hostname = cleanURL.hostname;
      const hash = cleanURL.hash;

      if (!hostname || !hash) {
        return result;
      }

      if (hostname !== window.location.hostname) {
        result.isExternal = true;
        result.error = false;
        return result;
      }

      // Extract the boardID
      const boardId = hash.split('/')[hash.split('/').length - 1];
      if (!isUUIDv4(boardId)) {
        // Invalid URL
        return result;
      } else {
        const board = boards.find((board) => board._id === boardId);
        if (board) {
          result.board = board;
          result.error = false;
          result.isExternal = false;
          return result;
        }
        return result;
      }
    } catch {
      return result;
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
    // Check URL
    if (!roomId) {
      // Check to see if the room you are in still exists
      if (selectedRoom && !rooms.find((r) => r._id === selectedRoom._id)) {
        setSelectedRoom(undefined);
        setSelectedBoard(undefined);
      }
      // Check to see if the board you are in still exists
      if (selectedBoard && !boards.find((board) => board._id === selectedBoard._id)) {
        setSelectedBoard(undefined);
      }
    }
  }, [JSON.stringify(rooms), JSON.stringify(boards)]);

  // Handle password modal
  useEffect(() => {
    if (passwordProtectedRoom) {
      passwordJoinRoomModalOnOpen();
    }
  }, [passwordProtectedRoom]);

  // Handle when the members list changes. Maybe the user was removed from the room
  useEffect(() => {
    // Check if is still a member of the room
    if (selectedRoom) {
      const roomMembership = members.find((m) => m.data.roomId === selectedRoom._id);
      const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
      if (!isMember) {
        setSelectedRoom(undefined);
        setSelectedBoard(undefined);
      }
    }
  }, [members]);

  return (
    // Main Container
    <Box display="flex" width="100svw" height="100svh" alignItems="center" p="3" backgroundColor={mainBackgroundColor} ref={introRef}>
      {/* Joyride */}
      <Joyride
        ref={joyrideRef}
        steps={joyrideSteps}
        run={runJoyride}
        callback={handleJoyrideCallback}
        disableScrolling
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

      {/* Confirmation Dialog to join a password protected room */}
      {passwordProtectedRoom && (
        <PasswordJoinRoomModal
          isOpen={passwordJoinRoomModalIsOpen}
          onClose={() => {
            passwordJoinRoomModalOnClose();
            setPasswordProtectedRoom(undefined);
          }}
          room={passwordProtectedRoom}
        />
      )}

      {/* Sidebar Drawer */}
      <Box
        borderRadius={cardRadius}
        width="20%"
        minWidth="220px"
        maxWidth="400px"
        transition="width 0.5s"
        height="100%"
        display="flex"
        flexDirection="column"
      >
        {/* Server selection and main actions */}
        {hubs.length > 0 ? (
          <Box ref={hubNameRef}>
            <Menu placement="bottom-end">
              <MenuButton
                marginTop="auto"
                display="flex"
                as={Box}
                backgroundColor={teal}
                height="40px"
                alignItems={'center'}
                justifyContent={'left'}
                borderRadius="10"
                width="100%"
                transition={'all 0.5s'}
                _hover={{ cursor: 'pointer' }}
              >
                <Box display="flex" justifyContent={'space-between'} alignItems={'center'}>
                  <Text ml="2" fontSize="24px" fontWeight="bold" whiteSpace={'nowrap'} textOverflow={'ellipsis'} overflow="hidden">
                    {config.serverName}
                  </Text>
                  <Box pr="3" fontSize="24px">
                    <LuChevronsUpDown />
                  </Box>
                </Box>
              </MenuButton>
              <MenuList width="20%" minWidth="220px" maxWidth="400px">
                {hubs.map((hub) => {
                  return (
                    <MenuItem
                      key={hub.id}
                      onClick={() => {
                        window.location.href = hub.url;
                      }}
                    >
                      {hub.name}
                    </MenuItem>
                  );
                })}
              </MenuList>
            </Menu>
          </Box>
        ) : (
          <Box bg={teal} borderRadius="10" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" ref={hubNameRef} height="40px">
            <Text fontSize="24px" fontWeight="bold" whiteSpace={'nowrap'} textOverflow={'ellipsis'} overflow="hidden" pl="2">
              {config.serverName}
            </Text>
          </Box>
        )}

        {/* Rooms and boards section */}
        <Box backgroundColor={sidebarBackgroundColor} borderRadius={cardRadius} my="3" overflow="hidden" height="100%" pt="3" pb="3">
          <Box display="flex" flexDirection="column" justifyItems="start" flex="1" height="100%" px="3" borderRadius={cardRadius}>
            <VStack align="stretch" gap="2px" height="100%">
              <Tooltip openDelay={400} hasArrow placement="top" label={'Navigate to home page.'}>
                <Box
                  ref={homeBtnRef}
                  h="40px"
                  display="flex"
                  justifyContent={'left'}
                  alignItems={'center'}
                  transition="all 0.5s"
                  pl="3"
                  borderRadius={buttonRadius}
                  _hover={{ backgroundColor: hightlightGray, cursor: 'pointer' }}
                  onClick={() => {
                    handleLeaveRoom();
                    toHome();
                    setSelectedQuickAccess(undefined);
                  }}
                >
                  <Icon as={MdHome} fontSize="24px" mr="2" />{' '}
                  <Text fontSize="md" fontWeight="bold">
                    Home
                  </Text>
                </Box>
              </Tooltip>
              <Divider my="2" />
              <HStack
                justify="space-between"
                alignItems="center"
                mb="2"
                pr="3"
                hidden={user?.data.userRole === 'spectator' || user?.data.userRole === 'guest'}
              >
                <Box pl="4" fontSize="md" fontWeight="bold">
                  Your Rooms
                </Box>
                <Tooltip hasArrow placement="top" label="Create a new Room" closeDelay={200}>
                  <IconButton
                    aria-label="Create Room"
                    onFocus={(e) => e.preventDefault()}
                    size="sm"
                    bg="none"
                    onClick={handleCreateRoomClick}
                    ref={createRoomRef}
                    _hover={{ transform: 'scale(1.1)', bg: 'none' }}
                    icon={<PiStackPlusFill fontSize="24px" />}
                  />
                </Tooltip>
              </HStack>
              <Box
                ref={roomsRef}
                height="100%"
                overflow="auto"
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
                hidden={user?.data.userRole === 'spectator' || user?.data.userRole === 'guest'}
              >
                <Box height="60%" mr="2" ml="1">
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
                          closeOnScroll
                        >
                          <Box
                            borderRadius="6"
                            key={room._id}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            transition="all 0.5s"
                            pl="3"
                            ml="2"
                            pr="2"
                            height="28px"
                            my="1px"
                            backgroundColor={room._id === selectedRoom?._id ? hightlightGrayValue : ''}
                            _hover={{ backgroundColor: hightlightGray, cursor: 'pointer' }}
                            onClick={() => handleRoomClick(room)}
                          >
                            <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis" mr="5">
                              <Text fontSize="md" pl="2">
                                {room.data.name}
                              </Text>
                            </Box>

                            <Text fontSize="xs" color={subTextColor}>
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

      {/* Full pages for quick access, commented out for now */}
      {/* {selectedQuickAccess && (
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
      )} */}

      {/* Selected Room */}
      {selectedRoom && rooms.length > 0 && (
        <Box
          display="flex"
          flex="1"
          flexDirection="column"
          backgroundColor={sidebarBackgroundColor}
          maxHeight="100svh"
          height="100%"
          borderRadius={cardRadius}
          marginLeft="3"
          pt={1}
          pr={4}
          pb={4}
          pl={6}
        >
          <Box width="100%" position="relative">
            {/* Room Information */}
            <VStack alignItems={'start'} gap="0">
              <Text fontSize="2xl" fontWeight="bold">
                {selectedRoom.data.name}
              </Text>
              <Text fontSize="xl" fontWeight={'normal'}>
                {selectedRoom?.data.description}
              </Text>

              <HStack>
                <Text color={subTextColor}>Created by {users.find((u) => u._id === selectedRoom.data.ownerId)?.data.name || 'sage3'}</Text>
                <Text color={subTextColor}>- Created on {new Date(selectedRoom._createdAt).toLocaleDateString()}</Text>
              </HStack>
              <Box display="flex" mt="1" gap="2">
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
                    colorScheme={rooms.filter(roomMemberFilter).find((room) => selectedRoom._id === room._id) ? 'red' : 'teal'}
                    variant="outline"
                    size="sm"
                    width="120px"
                    onClick={() => {
                      if (rooms.filter(roomMemberFilter).find((room) => selectedRoom._id === room._id)) {
                        leaveRoomModalOnOpen();
                      } else {
                        handleJoinRoomMembership(selectedRoom);
                      }
                    }}
                    isDisabled={selectedRoom.data.ownerId === userId}
                  >
                    {rooms.filter(roomMemberFilter).find((room) => selectedRoom._id === room._id) ? 'Unjoin' : 'Join'}
                  </Button>
                </Tooltip>
              </Box>
            </VStack>
          </Box>

          {rooms.filter(roomMemberFilter).find((room) => selectedRoom._id === room._id) ? (
            <Box width="100%" flexGrow={1} p={0} m={0}>
              <Tabs colorScheme="teal">
                <TabList>
                  <Tab>
                    <Icon as={MdDashboard} mr="1"></Icon>Boards
                  </Tab>
                  <Tab>
                    <Icon as={MdPeople} mr="1"></Icon>Members
                  </Tab>
                  <Tab>
                    <Icon as={MdFolder} mr="1"></Icon> Assets
                  </Tab>
                  <Tab>
                    <Icon as={HiPuzzle} mr="1"></Icon>Plugins
                  </Tab>
                </TabList>

                <TabPanels height="100%">
                  <TabPanel px="0">
                    <Box display="flex" gap="4">
                      <Flex gap="2" flexDirection="column">
                        <Flex align="center" gap="2" justify="flex-start" ml="2">
                          <Tooltip label="Create New Board" aria-label="Create Board" placement="top" hasArrow>
                            <IconButton
                              size="md"
                              variant={'outline'}
                              colorScheme={'teal'}
                              aria-label="favorite-board"
                              fontSize="xl"
                              onFocus={(e) => e.preventDefault()}
                              onClick={createBoardModalOnOpen}
                              isDisabled={!canCreateBoards}
                              icon={<MdAdd />}
                            ></IconButton>
                          </Tooltip>

                          <InputGroup size="md" width="365px" my="1">
                            <InputLeftElement pointerEvents="none">
                              <MdSearch />
                            </InputLeftElement>
                            <Input
                              placeholder="Search Boards"
                              value={boardSearch}
                              onChange={(e) => {
                                setBoardSearch(e.target.value);
                              }}
                            />
                          </InputGroup>
                          <ButtonGroup size="md" isAttached variant="outline">
                            <IconButton
                              aria-label="Board Grid View"
                              colorScheme={boardListView === 'grid' ? 'teal' : 'gray'}
                              onClick={() => {
                                setBoardListView('grid');
                              }}
                              icon={<MdGridView />}
                            />
                            <IconButton
                              aria-label="Board List View"
                              colorScheme={boardListView === 'list' ? 'teal' : 'gray'}
                              onClick={() => {
                                setBoardListView('list');
                              }}
                              icon={<MdList />}
                            />
                          </ButtonGroup>
                        </Flex>
                        {/* <Divider /> */}
                        {boardListView == 'grid' && (
                          <Flex
                            gap="4"
                            pl="2"
                            py="1"
                            display="flex"
                            flexWrap="wrap"
                            justifyContent="left"
                            style={{
                              maxHeight: 'calc(100svh - 270px)',
                              width: '100%',
                              maxWidth: '2200px',
                            }}
                            margin="0 auto"
                            overflowY="scroll"
                            overflowX="hidden"
                            minWidth="420px"
                            css={{
                              '&::-webkit-scrollbar': {
                                background: 'transparent',
                                width: '10px',
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
                                    room={selectedRoom}
                                    onClick={() => handleBoardClick(board)}
                                    // onClick={(board) => {handleBoardClick(board); enterBoardModalOnOpen()}}
                                    selected={selectedBoard ? selectedBoard._id === board._id : false}
                                    usersPresent={partialPrescences.filter((p) => p.data.boardId === board._id)}
                                  />
                                </Box>
                              ))}
                          </Flex>
                        )}

                        {boardListView == 'list' && (
                          <VStack
                            gap="3"
                            alignItems="left"
                            pl="2"
                            style={{ height: 'calc(100svh - 270px)' }}
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
                                    room={selectedRoom}
                                    onClick={() => handleBoardClick(board)}
                                    selected={selectedBoard ? selectedBoard._id === board._id : false}
                                    usersPresent={partialPrescences.filter((p) => p.data.boardId === board._id).length}
                                  />
                                </Box>
                              ))}
                          </VStack>
                        )}
                      </Flex>
                    </Box>
                  </TabPanel>
                  <TabPanel px="0">
                    <MembersList room={selectedRoom} />
                  </TabPanel>
                  <TabPanel px="0" display="flex">
                    <AssetList room={selectedRoom} />
                  </TabPanel>
                  <TabPanel px="0">
                    <PluginsList room={selectedRoom} />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          ) : (
            <>
              <Divider />
              <Box my="3">Join room to access boards.</Box>
            </>
          )}
        </Box>
      )}

      {/* Home when room or quick access are not selected */}
      {!selectedRoom && !selectedQuickAccess && (
        <Box
          ref={homeRef}
          display="flex"
          flexDirection="column"
          alignItems="center"
          backgroundColor={sidebarBackgroundColor}
          maxHeight="100svh"
          height="100%"
          borderRadius={cardRadius}
          marginLeft="3"
          width="100%"
          overflow="hidden"
          py="2"
          minWidth="600px"
        >
          <Box
            display="flex"
            flexDir="column"
            overflowX="hidden"
            overflowY="auto"
            height="100%"
            px="5"
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
            w="full"
            maxW="1600px"
          >
            {/* The clock Top Right */}
            <Box alignSelf="end" ref={clockRef} w="fit-content">
              <Clock isBoard={false} homeHelpClick={handleHomeHelpClick} />
            </Box>

            <Text fontSize="xx-large" fontWeight="bold" alignSelf="center">
              Good {getTimeBasedGreeting()}, {user?.data.name.split(' ')[0]}
            </Text>

            <Box
              mt="4"
              position="relative"
              onFocus={() => {
                setSearchSageFocused(true);
              }}
              ref={searchSageRef}
            >
              <InputGroup size="md" width="full" ref={searchInputRef}>
                <InputLeftElement pointerEvents="none">
                  <MdSearch />
                </InputLeftElement>
                <Input
                  placeholder="Search your rooms, boards, or join board via URL"
                  _placeholder={{ opacity: 0.7, color: searchPlaceholderColor }}
                  value={searchSage}
                  onChange={(e) => {
                    setSearchSage(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchSage('');
                    }
                  }}
                  roundedTop="2xl"
                  _focusVisible={{ bg: searchBarColor, outline: 'none', transition: 'none' }}
                  bg={isSearchSageFocused ? searchBarColor : 'inherit'}
                  roundedBottom={`${searchSage.length > 0 && isSearchSageFocused ? 'none' : '2xl'}`}
                />
              </InputGroup>
              <Box
                hidden={!(searchSage.length > 0) || !isSearchSageFocused}
                ref={searchSageRef}
                bg={searchBarColor}
                position="absolute"
                h="400px"
                w="full"
                pb="3"
                overflow="hidden"
                zIndex="200"
                borderTop="none"
                roundedBottom="2xl"
                border="1px solid"
                borderColor="inherit"
              >
                <Box
                  p="3"
                  mb="0"
                  h="full"
                  w="full"
                  overflow="auto"
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
                  {/* If it starts with https:// or http:// and is a valid URL */}
                  {(searchSage.startsWith('https://') || searchSage.startsWith('http://')) && isValidURL() && boards.length > 0 && (
                    <SearchRow.Url urlInfo={extractUrlInfo()} />
                  )}

                  {/* If it doesn't start with https:// or http:// and filtered roomsAndBoards have more than 1 item */}
                  {roomAndBoards &&
                    roomAndBoards.filter(sageSearchFilter).length > 0 &&
                    (!searchSage.startsWith('https://') || !searchSage.startsWith('http://')) &&
                    roomAndBoards.filter(sageSearchFilter).map((item: Room | (Board & { roomName: string })) => {
                      // If it's a board, get the room ID
                      if ((item as Board & { roomName: string }).data.roomId) {
                        return <SearchRow.Board key={item._id} board={item as Board & { roomName: string }} />;
                      }
                      return (
                        <SearchRow.Room
                          key={item._id}
                          room={item as Room}
                          clickHandler={() => {
                            handleRoomClick(item as Room);
                          }}
                        />
                      );
                    })}

                  {/* If there are no roomAndBoards and it's not a valid URL*/}
                  {roomAndBoards && roomAndBoards.filter(sageSearchFilter).length === 0 && !isValidURL() && 'No items match your search'}
                </Box>
              </Box>
            </Box>
            <Box borderRadius={cardRadius} height="100%" mt="4">
              <Tabs
                variant="unstyled"
                isLazy
                defaultIndex={boards.filter(boardActiveFilter).length > 0 ? 1 : 0}
                bg={homeSectionColor}
                pt="3"
                borderRadius={cardRadius}
              >
                <TabList px="5" h="30px" gap="1">
                  <Tab
                    _selected={{ bg: tabColor }}
                    _hover={{ bg: hightlightGray }}
                    borderRadius="lg"
                    fontWeight="bold"
                    ref={recentBoardsRef}
                  >
                    Recent Boards
                  </Tab>
                  <Tab
                    _selected={{ bg: tabColor }}
                    _hover={{ bg: hightlightGray }}
                    borderRadius="lg"
                    fontWeight="bold"
                    ref={activeBoardsRef}
                  >
                    Active Boards
                  </Tab>
                  <Tab
                    _selected={{ bg: tabColor }}
                    _hover={{ bg: hightlightGray }}
                    borderRadius="lg"
                    fontWeight="bold"
                    ref={starredBoardsRef}
                  >
                    Starred Boards
                  </Tab>
                </TabList>

                <TabPanels height="240px">
                  <TabPanel px="0" pt="2" id="Recent Boards" height="100%">
                    <Box background={homeSectionColor} borderRadius={cardRadius} px="3" overflow="hidden">
                      {/* TODO: MAKE THIS INTO SEPARATE COMPONENT */}
                      {recentBoards.length > 0 && boards.filter(recentBoardsFilter).length > 0 ? (
                        <HStack
                          gap="3"
                          width="100%"
                          overflowX="auto"
                          overflowY="hidden"
                          height="fit-content"
                          px="2"
                          pt="2"
                          pb="4"
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
                                  room={rooms.find((room) => board.data.roomId === room._id) as Room}
                                  onClick={() => handleBoardClick(board)}
                                  selected={selectedBoard ? selectedBoard._id === board._id : false}
                                  usersPresent={partialPrescences.filter((p) => p.data.boardId === board._id)}
                                />
                              </Box>
                            ))}
                        </HStack>
                      ) : (
                        <Text p="3" px="6">
                          No recent boards.
                        </Text>
                      )}
                    </Box>
                  </TabPanel>
                  <TabPanel px="0" pt="2" id="Active Boards">
                    <Box background={homeSectionColor} borderRadius={cardRadius} px="3" overflow="hidden">
                      {boards.filter(boardActiveFilter).length > 0 ? (
                        <HStack
                          gap="3"
                          width="100%"
                          overflowX="auto"
                          overflowY="hidden"
                          height="fit-content"
                          px="2"
                          pt="2"
                          pb="4"
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
                            .filter(boardActiveFilter)
                            .sort((a, b) => a.data.name.localeCompare(b.data.name))
                            .sort((a, b) => {
                              // Sorted by alpha then user count
                              const userCountA = partialPrescences.filter((p) => p.data.boardId === a._id).length;
                              const userCountB = partialPrescences.filter((p) => p.data.boardId === b._id).length;
                              return userCountB - userCountA;
                            })
                            .map((board) => (
                              <Box key={board._id} ref={board._id === selectedBoard?._id ? scrollToBoardRef : undefined}>
                                <BoardCard
                                  board={board}
                                  room={rooms.find((room) => board.data.roomId === room._id) as Room}
                                  onClick={() => handleBoardClick(board)}
                                  selected={selectedBoard ? selectedBoard._id === board._id : false}
                                  usersPresent={partialPrescences.filter((p) => p.data.boardId === board._id)}
                                />
                              </Box>
                            ))}
                        </HStack>
                      ) : (
                        <Text p="3" px="6">
                          No active boards.
                        </Text>
                      )}
                    </Box>
                  </TabPanel>
                  <TabPanel px="0" pt="2" id="Starred Boards">
                    <Box background={homeSectionColor} borderRadius={cardRadius} px="3" overflow="hidden">
                      {boards.filter(boardStarredFilter).length > 0 ? (
                        <HStack
                          gap="3"
                          width="100%"
                          overflowX="auto"
                          overflowY="hidden"
                          height="fit-content"
                          px="2"
                          pt="2"
                          pb="4"
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
                            .filter(boardStarredFilter)
                            .sort((a, b) => a.data.name.localeCompare(b.data.name))
                            .map((board) => (
                              <Box key={board._id} ref={board._id === selectedBoard?._id ? scrollToBoardRef : undefined}>
                                <BoardCard
                                  board={board}
                                  room={rooms.find((room) => board.data.roomId === room._id) as Room}
                                  onClick={() => handleBoardClick(board)}
                                  selected={selectedBoard ? selectedBoard._id === board._id : false}
                                  usersPresent={partialPrescences.filter((p) => p.data.boardId === board._id)}
                                />
                              </Box>
                            ))}
                        </HStack>
                      ) : (
                        <Text p="3" px="6">
                          No favorite boards.
                        </Text>
                      )}
                    </Box>
                  </TabPanel>
                </TabPanels>
              </Tabs>

              <Box mt="6" mb="3" hidden={user?.data.userRole === 'guest' || user?.data.userRole === 'spectator'}>
                <Box display="flex" justifyContent="space-between" alignItems="baseline" mb="1">
                  <Text fontWeight="bold">Available Rooms</Text>
                </Box>
                <Box p="4" bg={homeSectionColor} rounded="xl">
                  <Box display="flex" alignItems="center" gap="2">
                    <InputGroup size="sm" width="415px" my="1">
                      <InputLeftElement pointerEvents="none">
                        <MdSearch />
                      </InputLeftElement>
                      <Input
                        placeholder="Search available rooms"
                        _placeholder={{ opacity: 0.6, color: searchPlaceholderColor }}
                        _focusVisible={{ bg: searchBarColor, outline: 'none', transition: 'none' }}
                        // bg={isSearchSageFocused ? searchBarColor : 'inherit'}
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setRoomSearch('');
                          }
                        }}
                        rounded="md"
                      />
                    </InputGroup>
                    {/* <Box ref={createRoomRef}> */}
                    {/* </Box> */}
                  </Box>
                  <Box>
                    {rooms
                      .filter((room: Room) => room.data.isListed || (!room.data.isListed && room.data.ownerId === user?._id))
                      .filter(roomSearchFilter)
                      .sort((a, b) => a.data.name.localeCompare(b.data.name))
                      .map((room) => {
                        return (
                          <Box
                            borderRadius="lg"
                            bg={availableRoomsBgColor}
                            my="2"
                            p="5"
                            key={room._id}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            transition="all 0.5s"
                            height="28px"
                            _hover={{ backgroundColor: hightlightGray, cursor: 'pointer' }}
                            onClick={() => handleRoomClick(room)}
                          >
                            <Box whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                              <Text fontSize="md" pl="2">
                                {room.data.name}
                              </Text>
                            </Box>

                            <Text fontSize="xs" color={subTextColor}>
                              {room.data.ownerId === userId ||
                              members.find((roomMember) => roomMember.data.roomId === room._id)?.data.members.includes(userId) ? (
                                room.data.ownerId === userId ? (
                                  <Tag size="sm" width="100px" display="flex" justifyContent="center" colorScheme="green">
                                    Owner
                                  </Tag>
                                ) : (
                                  <Tag
                                    size="sm"
                                    width="100px"
                                    textAlign="center"
                                    display="flex"
                                    justifyContent="center"
                                    colorScheme="yellow"
                                  >
                                    Member
                                  </Tag>
                                )
                              ) : (
                                <Button
                                  size="xs"
                                  height="20px"
                                  width="100px"
                                  zIndex="10"
                                  colorScheme="teal"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (room.data.ownerId === userId) {
                                      return;
                                    }
                                    // if it is a private room, open the password modal
                                    if (room.data.isPrivate) {
                                      if (!passwordProtectedRoom) {
                                        setPasswordProtectedRoom(room);
                                      } else {
                                        setPasswordProtectedRoom(undefined);
                                      }
                                    } else {
                                      joinRoomMembership(room._id);
                                      toast({
                                        title: `You have successfully joined ${room.data.name}`,
                                        status: 'success',
                                        duration: 4 * 1000,
                                        isClosable: true,
                                      });
                                    }
                                  }}
                                >
                                  <Box mr="1">Join</Box>
                                  {room.data.isPrivate && <MdLock />}
                                </Button>
                              )}
                            </Text>
                          </Box>
                        );
                      })}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

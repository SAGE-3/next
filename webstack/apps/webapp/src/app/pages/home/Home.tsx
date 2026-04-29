/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React Imports
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

// Chakra Imports
import {
  Box,
  useColorModeValue,
  Text,
  useDisclosure,
  Icon,
  useToast,
  VStack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tooltip,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  Divider,
  useOutsideClick,
} from '@chakra-ui/react';

// Icons
import { MdAdd, MdHome, MdSearch, MdPeople, MdFolder, MdDashboard, MdSettings, MdExitToApp, MdMenu } from 'react-icons/md';
import { HiPuzzle } from 'react-icons/hi';
import { LuChevronsUpDown } from 'react-icons/lu';

// SAGE Imports
import { Board, PresencePartial, Room } from '@sage3/shared/types';
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
  ConfirmModal,
  Clock,
  isElectron,
  isUUIDv4,
  MainButton,
  PartyButton,
  apiUrls,
} from '@sage3/frontend';

import { AppInfo } from './components/BoardPreview';

// Home Page Components
import { BoardCard, RoomSearchModal, PasswordJoinRoomModal, AssetList, PluginsList, MembersList, BoardListPanel } from './components';
import SearchRow from './components/search/SearchRow';

/**
 * Home page for SAGE3
 * Displays all the rooms and boards that the user has access to
 * Users can create rooms and board and join other rooms as members
 * @returns JSX.Element
 */
export function HomePage() {
  const { toHome } = useRouteNav();
  const { roomId } = useParams();

  // Configuration information
  const config = useConfigStore((state) => state.config);

  // Electron
  const electron = isElectron();
  const [hubs, setHubs] = useState<{ name: string; id: string; url: string }[]>([]);

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

  // Presence
  const partialPrescences = usePresenceStore((state) => state.partialPrescences);
  const updatePresence = usePresenceStore((state) => state.update);
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);

  // Settings
  // User Selected Room, Board, and User
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(undefined);

  const [passwordProtectedRoom, setPasswordProtectedRoom] = useState<Room | undefined>(undefined);

  // Board preview data: boardId -> AppInfo[]. Fetched in batch on room switch; never auto-cleared.
  const [boardPreviews, setBoardPreviews] = useState<Map<string, AppInfo[]>>(new Map());
  const [previewsLoading, setPreviewsLoading] = useState(false);

  // searchSage: debounced value used for filtering; searchSageInput: live input display value
  const [searchSage, setSearchSage] = useState<string>('');
  const [searchSageInput, setSearchSageInput] = useState<string>('');
  const searchSageDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSearchSageFocused, setSearchSageFocused] = useState<boolean>(false);

  // Selected board ref — used to scroll the card into view
  const scrollToBoardRef = useRef<HTMLDivElement>(null);

  // Sidebar width — user-resizable via drag handle, persisted in localStorage
  const SIDEBAR_MIN = 180;
  // 600px gives enough room to display a full 50-character room name at the default font size.
  // (50 chars × ~8.5px avg width) + ~158px of nested padding/labels ≈ 583px needed.
  const SIDEBAR_MAX = 600;
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const stored = localStorage.getItem('sage3-sidebar-width');
    return stored ? Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, parseInt(stored, 10))) : 240;
  });
  const sidebarDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Begin drag: capture pointer and record start position
  const onSidebarDragHandlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    sidebarDragRef.current = { startX: e.clientX, startWidth: sidebarWidth };
  };

  // During drag: mutate DOM directly to avoid re-rendering the whole page on every mouse move
  const onSidebarDragHandlePointerMove = (e: React.PointerEvent) => {
    if (!sidebarDragRef.current) return;
    const delta = e.clientX - sidebarDragRef.current.startX;
    const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, sidebarDragRef.current.startWidth + delta));
    if (sidebarRef.current) sidebarRef.current.style.width = `${next}px`;
  };

  // End drag: sync final width into React state and persist to localStorage
  const onSidebarDragHandlePointerUp = (e: React.PointerEvent) => {
    if (!sidebarDragRef.current) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const delta = e.clientX - sidebarDragRef.current.startX;
    const final = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, sidebarDragRef.current.startWidth + delta));
    localStorage.setItem('sage3-sidebar-width', String(final));
    setSidebarWidth(final);
    sidebarDragRef.current = null;
  };

  // Toast to inform user that they are not a member of a room
  const toast = useToast();

  // Colors
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
  const searchBarColorValue = useColorModeValue('gray.100', '#2c2c2c');
  const searchBarColor = useHexColor(searchBarColorValue);
  const dividerTabValue = useColorModeValue('gray.300', 'gray.600');
  const dividerTabColor = useHexColor(dividerTabValue);
  const dividerTabHoverValue = useColorModeValue('gray.500', 'gray.400');
  const dividerTabHoverColor = useHexColor(dividerTabHoverValue);
  const searchPlaceholderColorValue = useColorModeValue('gray.400', 'gray.100');
  const searchPlaceholderColor = useHexColor(searchPlaceholderColorValue);
  const searchBgColorValue = useColorModeValue('gray.50', 'gray.800');
  const searchBgColor = useHexColor(searchBgColorValue);

  // Styling
  const buttonRadius = 'xl';
  const cardRadius = 'xl';

  // Modals Disclosures
  const { isOpen: createRoomModalIsOpen, onOpen: createRoomModalOnOpen, onClose: createRoomModalOnClose } = useDisclosure();
  const { isOpen: createBoardModalIsOpen, onOpen: createBoardModalOnOpen, onClose: createBoardModalOnClose } = useDisclosure();
  const { isOpen: enterBoardByURLModalIsOpen, onOpen: enterBoardByURLModalOnOpen, onClose: enterBoardByURLModalOnClose } = useDisclosure();
  const { isOpen: editRoomModalIsOpen, onOpen: editRoomModalOnOpen, onClose: editRoomModalOnClose } = useDisclosure();
  const { isOpen: editBoardModalIsOpen, onOpen: editBoardModalOnOpen, onClose: editBoardModalOnClose } = useDisclosure();
  const { isOpen: roomSearchModal, onOpen: roomSearchModalOnOpen, onClose: roomSearchModalOnClose } = useDisclosure();
  const { isOpen: leaveRoomModalIsOpen, onOpen: leaveRoomModalOnOpen, onClose: leaveRoomModalOnClose } = useDisclosure();
  const { isOpen: clearRecentBoardsModalIsOpen, onClose: clearRecentBoardsModalOnClose } = useDisclosure();
  const {
    isOpen: passwordJoinRoomModalIsOpen,
    onOpen: passwordJoinRoomModalOnOpen,
    onClose: passwordJoinRoomModalOnClose,
  } = useDisclosure();

  // Permissions
  const canJoin = SAGE3Ability.canCurrentUser('join', 'roommembers');
  const canCreateRoom = SAGE3Ability.canCurrentUser('create', 'rooms');
  const canCreateBoards = SAGE3Ability.canCurrentUser('create', 'boards');

  // Refs
  const homeRef = useRef<HTMLDivElement>(null);
  const homeBtnRef = useRef<HTMLDivElement>(null);
  const mainButtonRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  const hubNameRef = useRef<HTMLDivElement>(null);
  const createRoomRef = useRef<HTMLButtonElement>(null);
  const searchSageRef = useRef<null | HTMLDivElement>(null);
  const searchInputRef = useRef<null | HTMLDivElement>(null);
  const roomsRef = useRef<HTMLDivElement>(null);
  const activeBoardsRef = useRef<HTMLParagraphElement>(null);
  const starredBoardsRef = useRef<HTMLParagraphElement>(null);
  const recentBoardsRef = useRef<HTMLParagraphElement>(null);

  // Filter Functions
  const roomMemberFilter = (room: Room): boolean => {
    if (!user) return false;
    const roomMembership = members.find((m) => m.data.roomId === room._id);
    const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
    const isOwner = room.data.ownerId === userId;
    return isMember || isOwner;
  };

  const boardActiveFilter = (board: Board): boolean => {
    const roomMembership = members.find((m) => m.data.roomId === board.data.roomId);
    const userCount = (presenceByBoard.get(board._id) ?? []).length;

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

  // Presence grouped by boardId — avoids O(boards × presences) filter on every render
  const presenceByBoard = useMemo(() => {
    const map = new Map<string, PresencePartial[]>();
    partialPrescences.forEach((p) => {
      const existing = map.get(p.data.boardId);
      if (existing) existing.push(p);
      else map.set(p.data.boardId, [p]);
    });
    return map;
  }, [partialPrescences]);

  // Keep preview fetching aligned with the exact board cards visible on screen.
  // This avoids first-load races where memberships or presence arrive after boards.
  const previewBoardIds = useMemo(() => {
    if (selectedRoom) {
      return boards.filter((b) => b.data.roomId === selectedRoom._id).map((b) => b._id);
    }

    const ids = new Set<string>();
    const isGuestLike = user?.data.userRole === 'guest' || user?.data.userRole === 'spectator';
    const recentOrStarred = new Set([...recentBoards, ...savedBoards]);

    boards.forEach((board) => {
      const roomMembership = members.find((m) => m.data.roomId === board.data.roomId);
      const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(userId) : false;
      const isRecent = recentBoards.includes(board._id);
      const isSaved = savedBoards.includes(board._id);
      const userCount = (presenceByBoard.get(board._id) ?? []).length;

      if (isGuestLike) {
        if (isRecent || isSaved || (recentOrStarred.has(board._id) && userCount > 0)) {
          ids.add(board._id);
        }
        return;
      }

      if (isMember && (isRecent || isSaved || userCount > 0)) {
        ids.add(board._id);
      }
    });

    return [...ids];
  }, [selectedRoom?._id, boards, members, recentBoards, savedBoards, presenceByBoard, user?.data.userRole, userId]);

  // Fetch batch previews for the given boardIds, merging results into state.
  // Pass force=true to bypass the server-side cache (used by the refresh button).
  const fetchPreviews = async (boardIds: string[], force = false) => {
    if (boardIds.length === 0) return;
    setPreviewsLoading(true);
    try {
      const response = await fetch(apiUrls.boards.preview, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardIds, force }),
      });
      const res = await response.json();
      if (res.success && res.data) {
        setBoardPreviews((prev) => {
          const next = new Map(prev);
          Object.entries(res.data as Record<string, AppInfo[]>).forEach(([id, apps]) => next.set(id, apps));
          return next;
        });
      }
    } catch {
      // Preview is non-critical — fail silently
    } finally {
      setPreviewsLoading(false);
    }
  };

  // Re-fetch previews for the current context (room view or home view), bypassing cached entries
  const refreshPreviews = async () => {
    const idsToRefresh = previewBoardIds;

    // Clear existing entries so fetchPreviews treats them as missing
    setBoardPreviews((prev) => {
      const next = new Map(prev);
      idsToRefresh.forEach((id) => next.delete(id));
      return next;
    });
    await fetchPreviews(idsToRefresh, true);
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
        setSelectedRoom(room);
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
    }
  }, [selectedRoom]);

  // Fetch previews for whichever board cards are currently visible.
  useEffect(() => {
    const ids = previewBoardIds.filter((id) => !boardPreviews.has(id));
    fetchPreviews(ids);
  }, [previewBoardIds, boardPreviews]);

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

  // Handle when the user wants to leave a room membership
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
    } else {
      // Update the current room if it was modified
      if (roomId && roomsFetched && user) {
        const room = rooms.find((r) => r._id === roomId);
        if (room) {
          setSelectedRoom(room);
          setSelectedBoard(undefined);
        }
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
    <Box display="flex" width="100svw" height="100svh" alignItems="center" p="3" backgroundColor={mainBackgroundColor}>
      {/* Party Button */}
      <Box position="absolute" right="2" bottom="2" zIndex="1000" pl="2" pt="2" backgroundColor={mainBackgroundValue} borderRadius={'lg'}>
        <PartyButton iconSize="sm" />
      </Box>
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

      {/* Room Search Modal */}
      <RoomSearchModal isOpen={roomSearchModal} onClose={roomSearchModalOnClose} users={users} />

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
        ref={sidebarRef}
        borderRadius={cardRadius}
        width={`${sidebarWidth}px`}
        minWidth={`${SIDEBAR_MIN}px`}
        maxWidth={`${SIDEBAR_MAX}px`}
        flexShrink={0}
        mr="1.5"
        height="100%"
        display="flex"
        flexDirection="column"
      >
        {/* Server selection and main actions */}
        {hubs.length > 0 ? (
          <Box ref={hubNameRef}>
            <Menu placement="bottom-start">
              <MenuButton
                as={Button}
                colorScheme="teal"
                variant="solid"
                size="sm"
                width="100%"
                borderRadius="10"
                px={4}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                  <Text fontWeight="bold" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">
                    {config.serverName}
                  </Text>
                  <Box fontSize="lg" flexShrink={0} ml={2}>
                    <LuChevronsUpDown />
                  </Box>
                </Box>
              </MenuButton>
              <MenuList width={`${sidebarWidth}px`}>
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
          <Button
            colorScheme="teal"
            variant="solid"
            size="sm"
            width="100%"
            borderRadius="10"
            px={4}
            pointerEvents="none"
          >
            <Text fontWeight="bold" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" width="100%" textAlign="left">
              {config.serverName}
            </Text>
          </Button>
        )}

        {/* Rooms  section */}
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
                  Rooms
                </Box>
                <Box display="flex" alignItems="center" gap="2">
                  <Tooltip hasArrow placement="top" label="Search Rooms" closeDelay={200}>
                    <IconButton
                      aria-label="Search Rooms"
                      onFocus={(e) => e.preventDefault()}
                      size="sm"
                      bg="none"
                      onClick={handleRoomSearchClick}
                      ref={createRoomRef}
                      _hover={{ transform: 'scale(1.1)', bg: 'none' }}
                      icon={<MdSearch fontSize="24px" />}
                    />
                  </Tooltip>
                  <Tooltip hasArrow placement="top" label="Create New Room" closeDelay={200}>
                    <IconButton
                      aria-label="Create Room"
                      onFocus={(e) => e.preventDefault()}
                      size="sm"
                      bg="none"
                      onClick={handleCreateRoomClick}
                      ref={createRoomRef}
                      _hover={{ transform: 'scale(1.1)', bg: 'none' }}
                      icon={<MdAdd fontSize="24px" />}
                    />
                  </Tooltip>
                </Box>
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
                          placement="right"
                          label={room.data.description ? `${room.data.name} — ${room.data.description}` : room.data.name}
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

      {/* Drag handle — grab to resize the sidebar */}
      <Box width="10px" height="100%" flexShrink={0} display="flex" alignItems="center" justifyContent="center">
        <Box
          width="6px"
          height="150px"
          borderRadius="full"
          bg={dividerTabColor}
          cursor="col-resize"
          _hover={{ bg: dividerTabHoverColor }}
          transition="background 0.15s"
          onPointerDown={onSidebarDragHandlePointerDown}
          onPointerMove={onSidebarDragHandlePointerMove}
          onPointerUp={onSidebarDragHandlePointerUp}
        />
      </Box>

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
          marginLeft="1.5"
          p={[1, 4, 4, 6]} // top right bottom left
        >
          <Box width="100%" position="relative">
            {/* Room Information */}
            <HStack alignItems="center" gap="3">
              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="Room options"
                  bg="none"
                  icon={<MdMenu fontSize="32px" />}
                  variant="ghost"
                  size="lg"
                  _hover={{ transform: 'scale(1.2)', bg: 'none' }}
                  _focus={{ bg: 'none' }}
                />
                <MenuList>
                  <Box p="3" pt="0" borderBottom="1px solid" borderColor={useColorModeValue('gray.200', 'gray.600')}>
                    <Text fontSize="sm" fontWeight="bold" mb="1" mt="0">Room Details</Text>
                    <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                      Created by: {users.find((u) => u._id === selectedRoom.data.ownerId)?.data.name || 'sage3'}
                    </Text>
                    <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                      Created on: {new Date(selectedRoom._createdAt).toLocaleDateString()}
                    </Text>
                    <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')}>
                      Members: {(() => {
                        const roomMembership = members.find((m) => m.data.roomId === selectedRoom._id);
                        return roomMembership && roomMembership.data.members ? roomMembership.data.members.length : 0;
                      })()}
                    </Text>
                  </Box>
                  <Tooltip
                    label={
                      selectedRoom.data.ownerId === userId ? `Update the room's settings` : 'Only the owner can update the room settings'
                    }
                    openDelay={400}
                    hasArrow
                    placement="right"
                  >
                    <MenuItem
                      icon={<Icon as={MdSettings} fontSize="18px" />}
                      isDisabled={selectedRoom.data.ownerId !== userId}
                      onClick={editRoomModalOnOpen}
                    >
                      Settings
                    </MenuItem>
                  </Tooltip>
                  <Tooltip
                    label={selectedRoom.data.ownerId === userId ? 'Owners cannot leave their own room.' : 'Leave this room'}
                    openDelay={400}
                    hasArrow
                    placement="right"
                  >
                    <MenuItem
                      icon={<Icon as={MdExitToApp} fontSize="18px" />}
                      onClick={() => {
                        leaveRoomModalOnOpen();
                      }}
                      isDisabled={selectedRoom.data.ownerId === userId}
                      color={""}
                      fontStyle={'bold'}
                    >
                      Unjoin
                    </MenuItem>
                  </Tooltip>
                </MenuList>
              </Menu>
              <Text fontSize="4xl" fontWeight="bold">
                {selectedRoom.data.name}
              </Text>
            </HStack>
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
                    {/* key={selectedRoom?._id} remounts the panel on room change, resetting search state */}
                    <BoardListPanel
                      key={selectedRoom?._id}
                      boards={boards}
                      selectedRoom={selectedRoom}
                      selectedBoard={selectedBoard}
                      presenceByBoard={presenceByBoard}
                      boardPreviews={boardPreviews}
                      previewsLoading={previewsLoading}
                      canCreateBoards={canCreateBoards}
                      scrollToBoardRef={scrollToBoardRef}
                      onCreateBoard={createBoardModalOnOpen}
                      onRefreshPreviews={refreshPreviews}
                      onBoardClick={handleBoardClick}
                    />
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

      {/* Home when room is not selected */}
      {!selectedRoom && (
        <Box
          ref={homeRef}
          display="flex"
          flex="1"
          flexDirection="column"
          alignItems="flex-start"
          backgroundColor={sidebarBackgroundColor}
          maxHeight="100svh"
          height="100%"
          borderRadius={cardRadius}
          marginLeft="1.5"
          width="100%"
          overflow="hidden"
          py="2"
          minWidth="600px"
        >
          {/* The clock Top Right */}
          <Box alignSelf="end" mr="2" ref={clockRef} w="fit-content">
            <Clock isBoard={false} />
          </Box>
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
          >
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
                  value={searchSageInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchSageInput(value);
                    if (searchSageDebounceRef.current) clearTimeout(searchSageDebounceRef.current);
                    searchSageDebounceRef.current = setTimeout(() => setSearchSage(value), 150);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchSageInput('');
                      setSearchSage('');
                    }
                  }}
                  roundedTop="2xl"
                  _focusVisible={{ bg: searchBarColor, outline: 'none', transition: 'none' }}
                  bg={isSearchSageFocused ? searchBarColor : 'inherit'}
                  roundedBottom={`${searchSageInput.length > 0 && isSearchSageFocused ? 'none' : '2xl'}`}
                />
              </InputGroup>
              <Box
                hidden={!(searchSageInput.length > 0) || !isSearchSageFocused}
                ref={searchSageRef}
                bg={searchBgColor}
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
                      background: 'scrollBarColor',
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
                    (!searchSage.startsWith('https://') || !searchSage.startsWith('http://')) && (
                      (() => {
                        // Separate boards and rooms
                        const filteredItems = roomAndBoards.filter(sageSearchFilter);
                        const boards = filteredItems.filter((item): item is Board & { roomName: string } =>
                          (item as Board & { roomName: string }).data.roomId !== undefined
                        );
                        const rooms = filteredItems.filter((item): item is Room =>
                          (item as Board & { roomName: string }).data.roomId === undefined
                        );

                        return (
                          <SearchRow.Grouped
                            boards={boards}
                            rooms={rooms}
                            onBoardClick={(board) => {
                              handleBoardClick(board);
                            }}
                            onRoomClick={(room) => {
                              handleRoomClick(room);
                            }}
                          />
                        );
                      })()
                    )}

                  {/* If there are no roomAndBoards and it's not a valid URL*/}
                  {roomAndBoards && roomAndBoards.filter(sageSearchFilter).length === 0 && !isValidURL() && 'No items match your search'}
                </Box>
              </Box>
            </Box>

            <VStack spacing="6" mt="4" width="100%">
              {/* Recent Boards Section */}
              <Box width="100%">
                <Text fontWeight="bold" mb="2" ref={recentBoardsRef}>
                  Recent Boards
                </Text>
                <Box
                  background={homeSectionColor}
                  borderRadius={cardRadius}
                  px="3"
                  py="3"
                  overflow="hidden"
                  height="240px"
                  display="flex"
                  alignItems="center"
                >
                  {recentBoards.length > 0 && boards.filter(recentBoardsFilter).length > 0 ? (
                    <HStack
                      gap="3"
                      width="100%"
                      height="240px"
                      overflowX="auto"
                      overflowY="hidden"

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
                        .map((board) => {
                          const room = rooms.find((room) => board.data.roomId === room._id);
                          if (!room) return null;
                          return (
                            <Box key={board._id} ref={board._id === selectedBoard?._id ? scrollToBoardRef : undefined}>
                              <BoardCard
                                board={board}
                                room={room}
                                onClick={() => handleBoardClick(board)}
                                selected={selectedBoard ? selectedBoard._id === board._id : false}
                                usersPresent={presenceByBoard.get(board._id) ?? []}
                                appInfo={boardPreviews.get(board._id) ?? []}
                              />
                            </Box>
                          );
                        })}
                    </HStack>
                  ) : (
                    <Text p="3" px="6">
                      No recent boards.
                    </Text>
                  )}
                </Box>
              </Box>

              {/* Starred Boards Section */}
              <Box width="100%">
                <Text fontWeight="bold" mb="2" ref={starredBoardsRef}>
                  Starred Boards
                </Text>
                <Box
                  background={homeSectionColor}
                  borderRadius={cardRadius}
                  px="3"
                  py="3"
                  overflow="hidden"
                  height="240px"
                  display="flex"
                  alignItems="center"
                >
                  {boards.filter(boardStarredFilter).length > 0 ? (
                    <HStack
                      gap="3"
                      width="100%"
                      overflowX="auto"
                      overflowY="hidden"
                      height="240px"
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
                        .filter(boardStarredFilter)
                        .sort((a, b) => a.data.name.localeCompare(b.data.name))
                        .map((board) => {
                          const room = rooms.find((room) => board.data.roomId === room._id);
                          if (!room) return null;
                          return (
                            <Box key={board._id} ref={board._id === selectedBoard?._id ? scrollToBoardRef : undefined}>
                              <BoardCard
                                board={board}
                                room={room}
                                onClick={() => handleBoardClick(board)}
                                selected={selectedBoard ? selectedBoard._id === board._id : false}
                                usersPresent={presenceByBoard.get(board._id) ?? []}
                                appInfo={boardPreviews.get(board._id) ?? []}
                              />
                            </Box>
                          );
                        })}
                    </HStack>
                  ) : (
                    <Text p="3" px="6">
                      No favorite boards.
                    </Text>
                  )}
                </Box>
              </Box>

              {/* Active Boards Section */}
              <Box width="100%">
                <Text fontWeight="bold" mb="2" ref={activeBoardsRef}>
                  Active Boards
                </Text>
                <Box
                  background={homeSectionColor}
                  borderRadius={cardRadius}
                  px="3"
                  py="3"
                  overflow="hidden"
                  height="240px"
                  display="flex"
                  alignItems="center"
                >
                  {boards.filter(boardActiveFilter).length > 0 ? (
                    <HStack
                      gap="3"
                      width="100%"
                      overflowX="auto"
                      overflowY="hidden"
                      height="240px"
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
                        .filter(boardActiveFilter)
                        .sort((a, b) => a.data.name.localeCompare(b.data.name))
                        .sort((a, b) => {
                          // Sorted by alpha then user count
                          const userCountA = (presenceByBoard.get(a._id) ?? []).length;
                          const userCountB = (presenceByBoard.get(b._id) ?? []).length;
                          return userCountB - userCountA;
                        })
                        .map((board) => {
                          const room = rooms.find((room) => board.data.roomId === room._id);
                          if (!room) return null;
                          return (
                            <Box key={board._id} ref={board._id === selectedBoard?._id ? scrollToBoardRef : undefined}>
                              <BoardCard
                                board={board}
                                room={room}
                                onClick={() => handleBoardClick(board)}
                                selected={selectedBoard ? selectedBoard._id === board._id : false}
                                usersPresent={presenceByBoard.get(board._id) ?? []}
                                appInfo={boardPreviews.get(board._id) ?? []}
                              />
                            </Box>
                          );
                        })}
                    </HStack>
                  ) : (
                    <Text p="3" px="6">
                      No active boards.
                    </Text>
                  )}
                </Box>
              </Box>

            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  useToast,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  Box,
  CircularProgress,
} from '@chakra-ui/react';

import {
  useAppStore,
  useRouteNav,
  useBoardStore,
  useRoomStore,
  usePresenceStore,
  useUsersStore,
  PasteHandler,
  useUIStore,
  useUser,
  usePluginListener,
  usePluginStore,
  useAuth,
  isElectron,
  getSAGE3BoardUrl,
  useInsightStore,
  useAssetStore,
  useHexColor,
  useLinkStore,
} from '@sage3/frontend';

// Board Layers
import { BackgroundLayer, UILayer } from './layers';
import { InteractionbarShortcuts } from './layers/ui/components';

// Development or production
const development: boolean = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

/**
 * The board page which displays the board and its apps.
 */
export function BoardPage() {
  // Navigation and routing
  const { roomId, boardId } = useParams();
  const { toHome } = useRouteNav();

  if (!roomId || !boardId) {
    toHome(roomId);
    return null;
  }

  // Board and App Store stuff
  const subApps = useAppStore((state) => state.subToBoard);
  const unsubBoard = useAppStore((state) => state.unsubToBoard);
  const subBoards = useBoardStore((state) => state.subscribeByRoomId);
  const subRooms = useRoomStore((state) => state.subscribeToAllRooms);
  const subAssets = useAssetStore((state) => state.subscribe);
  const subPlugins = usePluginStore((state) => state.subscribeToPlugins);
  const subLinks = useLinkStore((state) => state.subscribe);

  // Initial Load state
  const [initialLoad, setInitialLoad] = useState(false);

  // User information
  const { expire, logout } = useAuth();

  // Presence Information
  const { user, recentBoardAdd } = useUser();
  const updatePresence = usePresenceStore((state) => state.update);
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);
  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);

  // Insights
  const subToInsight = useInsightStore((state) => state.subscribe);
  const unsubToInsight = useInsightStore((state) => state.unsubscribe);

  // UI Store
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);

  // Modal panel
  const { isOpen, onOpen, onClose } = useDisclosure();
  // Element to set the focus to when opening the dialog
  const initialRef = useRef<HTMLButtonElement>(null);

  // Plugin Listener: updates from plugin apps and sends them to the AppStore
  usePluginListener();

  // UI Message
  const toast = useToast();

  function handleDragOver(event: DragEvent) {
    const elt = event.target as HTMLElement;
    const ids = ['board', 'whiteboard', 'lasso'];
    if (!ids.includes(elt.id)) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
      event.preventDefault();
    }
  }
  function handleDrop(event: DragEvent) {
    event.preventDefault();
  }

  function saveBoardIdToLocalStorage() {
    if (!boardId) return;
    localStorage.setItem('boardId', boardId);
  }

  function onLogout() {
    onClose();
    logout();
  }

  // If you are removed as a member from the room this board belongs to, redict to the homepage
  // useEffect(() => {
  //   if (!user) return;
  //   const isGuest = user.data.userRole === 'guest';
  //   if (isGuest) return;
  //   const members = useRoomStore.getState().members;
  //   const roomMembership = members.find((m) => m.data.roomId === roomId);
  //   const isMember = roomMembership && roomMembership.data.members ? roomMembership.data.members.includes(user._id) : false;
  //   if (!isMember) {
  //     toast({
  //       title: 'Room Membership Invalid',
  //       description: `You are not member of this room.`,
  //       status: 'error',
  //       duration: 5000,
  //       isClosable: false,
  //     });
  //   }
  // }, [user]);

  // Scroll detection
  useEffect(() => {
    // Detect for scroll event on the 'root' div
    const root = document.getElementById('root');
    if (!root) return;
    // Function for scroll correction
    const scrollCorrection = () => {
      const x = root.scrollLeft;
      const y = root.scrollTop;
      // If x is not 0 set it to 0
      if (x !== 0) root.scrollLeft = 0;
      // If y is not 0 set it to 0
      if (y !== 0) root.scrollTop = 0;
    };
    // Add the event listener on mount
    root.addEventListener('scroll', scrollCorrection);
    return () => {
      // Remove the event listener on unmount
      root.removeEventListener('scroll', scrollCorrection);
    };
  }, []);

  // Handle joining and leave a board
  useEffect(() => {
    // Update the document title
    document.title = 'SAGE3 - Board';

    async function handleJoinBoard(rId: string, bId: string) {
      // assets
      await subAssets(rId);
      // This is if someone is joining a board by a link
      subRooms();
      // Sub to boards belonging to this room
      subBoards(rId);
      // Subscribe to the app on the board that was selected
      subApps(bId);
      // Sub to users and presence
      subscribeToPresence();
      subscribeToUsers();
      // Sub to insights
      subToInsight(bId);
      // plugins
      subPlugins();
      setInitialLoad(true);
      // links
      subLinks(bId);
    }

    handleJoinBoard(roomId, boardId);

    // Update the user's presence information
    if (user) updatePresence(user._id, { boardId, roomId, following: '' });
    // Add the board to the user's recent boards
    if (recentBoardAdd) recentBoardAdd(boardId);

    // Set Selected app to empty
    setSelectedApp('');

    // Prevent drag/drop when not on the board
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    // Handle a refresh to keep the user on the board
    window.addEventListener('beforeunload', saveBoardIdToLocalStorage);

    // If the user's session is close to expiration, show the modal to logout
    if (expire > 0) {
      const now = new Date();
      const expireDate = new Date(expire);
      const timeLeft = expireDate.getTime() - now.getTime();
      // if less than 4 hours left
      if (timeLeft < 3600 * 1000 * 4) {
        onOpen();
      }
    }

    if (!isElectron() && !development) {
      // Function to open the board in the desktop app
      function openDesktopApp() {
        if (!boardId || !roomId) return;
        // Get the board link
        const link = getSAGE3BoardUrl(roomId, boardId);
        // Close the toast
        toast.closeAll();
        // Open the link in the sage3 app
        window.open(link, '_self');
      }

      // Close the toast
      toast.closeAll();

      // Show a notification
      toast({
        title: 'Reduced Functionality in Browser Version',
        status: 'warning',
        duration: null, // never close automatically
        isClosable: true,
        position: 'bottom',
        description: (
          <div>
            <p>
              Using SAGE3 on a web browser will __not__ support several key features that are only available on the SAGE3 application.
              Download the SAGE3 application at{' '}
              <a target="_blank" style={{ textDecoration: 'underline' }} href="https://sage3.sagecommons.org/?page_id=358">
                sage3.sagecommons.org
              </a>
              .
            </p>
            <p style={{ marginTop: '8px' }}>
              Would you like to open this board in the SAGE3 application (if you have it installed)?
              <Button ml="2" size="xs" colorScheme={'green'} onClick={openDesktopApp}>
                OK
              </Button>
            </p>
          </div>
        ),
      });
    }

    // Unmounting of the board page. user must have redirected back to the homepage. Unsubscribe from the board.
    return () => {
      // Unsub from board updates
      unsubBoard(user ? user._id : '');
      // Update the user's presence information
      if (user) updatePresence(user._id, { boardId: '', roomId: '', following: '' });
      // Set Selected app to empty
      setSelectedApp('');
      // Unsub from insights
      unsubToInsight();
      // Remove event listeners
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
      window.removeEventListener('beforeunload', saveBoardIdToLocalStorage);
    };
  }, [roomId, boardId]);

  return (
    <>
      {/* The apps live here but show loading icon while we wait*/}

      {initialLoad ? <BackgroundLayer boardId={boardId} roomId={roomId}></BackgroundLayer> : LoadingSpinner()}

      {/* Upper layer for local UI stuff */}
      <UILayer boardId={boardId} roomId={roomId}></UILayer>

      {/* Paste data on the board */}
      <PasteHandler boardId={boardId} roomId={roomId} />

      {/* Interaction Shortcuts */}
      <InteractionbarShortcuts />

      {/* Modal if session is expired */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" initialFocusRef={initialRef} isCentered blockScrollOnMount={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Your session has expired</ModalHeader>
          <ModalBody>Please log in again to continue using SAGE3.</ModalBody>
          <ModalFooter>
            <Button colorScheme="red" onClick={onLogout} ref={initialRef}>
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// Render a spinning chakra loading icon in the center of the page
export const LoadingSpinner = () => {
  const teal = useHexColor('teal');
  return (
    <Box width="100vw" height="100vh" display="flex" justifyContent={'center'} alignItems={'center'}>
      <CircularProgress isIndeterminate size={'xl'} color={teal} />
    </Box>
  );
};

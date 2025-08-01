/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, useColorModeValue, Image, Text, VStack, Spacer, Box, Link, Flex, Icon, useToast, Progress, HStack, Divider } from '@chakra-ui/react';
import { FiExternalLink } from 'react-icons/fi';

// SAGE3
import { isElectron, useBoardStore, useHexColor, useRoomStore, useRouteNav, useAuth, useUser } from '@sage3/frontend';

/**
 * Landing page for /enter/:roomId/:boardId links
 * Handles both desktop client and web browser users
 */
export function OpenDesktopPage() {
  const { roomId, boardId } = useParams();

  const mainBackgroundValue = useColorModeValue('gray.100', '#222222');
  const mainBackgroundColor = useHexColor(mainBackgroundValue);
  const imageUrl = '/assets/sage3_banner.webp';

  const [sage3url, setSage3Url] = useState<string>('');

  const { toHome, toBoard } = useRouteNav();
  const joinRoomMembership = useRoomStore((state) => state.joinRoomMembership);
  const fetchRoom = useRoomStore((state) => state.fetchRoom);
  const fetchBoard = useBoardStore((state) => state.fetchBoard);

  // Auth state for Electron client routing
  const { auth, loading: authLoading } = useAuth();
  const { user, loading: userLoading } = useUser();

  const toast = useToast();

  /**
   * Validates UUID format for room and board IDs
   */
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  /**
   * Clears saved board context from localStorage
   */
  const clearSavedBoardContext = () => {
    try {
      localStorage.removeItem('sage3_pending_board');
    } catch (error) {
      console.warn('Could not clear saved board context:', error);
    }
  };

  /**
   * Opens the desktop client with the board link
   */
  const openDesktopApp = () => {
    if (!boardId || !roomId) return;
    const link = `sage3://${window.location.host}/#/enter/${roomId}/${boardId}`;
    window.open(link, '_self');
  };

  /**
   * Continues to board in browser and clears saved context
   */
  const continueInBrowser = () => {
    if (!boardId || !roomId) return;
    clearSavedBoardContext();
    toBoard(roomId, boardId);
  };

  /**
   * Joins a board and room, handles errors
   */
  async function JoinBoard(roomId: string, boardId: string) {
    const room = await fetchRoom(roomId);
    const board = await fetchBoard(boardId);
    
    if (!room || !board) {
      toast({
        title: 'Error',
        description: 'Room or Board not found',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      toHome();
      return;
    }

    // Join room and navigate to board
    joinRoomMembership(roomId);

    
    clearSavedBoardContext();
    toBoard(roomId, boardId);
  }

  /**
   * Handles board context saving and Electron client routing
   */
  useEffect(() => {
    if (!boardId || !roomId) {
      toast({
        title: 'Invalid Link',
        description: 'This link is missing required information.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      toHome();
      return;
    }

    // Validate UUID format
    if (!isValidUUID(roomId) || !isValidUUID(boardId)) {
      toast({
        title: 'Invalid Link Format',
        description: 'This link contains invalid room or board identifiers.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      toHome();
      return;
    }
    
    // Set board URL for manual navigation
    const link = `${window.location.protocol}//${window.location.host}/#/board/${roomId}/${boardId}`;
    setSage3Url(link);

    // Save board context for later retrieval
    const boardContext = {
      roomId,
      boardId,
      timestamp: Date.now(),
      url: window.location.href
    };
    
    try {
      localStorage.setItem('sage3_pending_board', JSON.stringify(boardContext));
      toast({
        title: 'Board Context Saved',
        description: 'Your board context has been saved. You will be redirected after login.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.warn('Could not save board context to localStorage:', error);
      toast({
        title: 'Warning',
        description: 'Could not save board context. You may need to log in first.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }

    // Handle Electron client routing
    if (isElectron()) {
      // Wait for auth state to be determined
      if (!authLoading && !userLoading) {
        if (auth && user) {
          // User authenticated with account - auto-join board
          JoinBoard(roomId, boardId);
        } else if (auth && !user) {
          // User authenticated but no account - redirect to create account
          window.location.href = `/#/createuser?returnTo=${encodeURIComponent(`/board/${roomId}/${boardId}`)}`;
        } else {
          // User not authenticated - redirect to login
          window.location.href = `/#/?returnTo=${encodeURIComponent(`/board/${roomId}/${boardId}`)}`;
        }
      }
    }
  }, [roomId, boardId, auth, user, authLoading, userLoading]);

  // Show loading while checking auth state (Electron client only)
  if (isElectron() && (authLoading || userLoading)) {
    return (
      <VStack display="flex" width="100svw" height="100svh" alignItems="center" p="3" backgroundColor={mainBackgroundColor}>
        <Spacer />
        <Image src={imageUrl} width="30%" alt="sage3" userSelect={'auto'} draggable={false} />
        <Spacer />
        <Progress size="lg" isIndeterminate colorScheme="green" width="50%" />
        <Text fontSize="xl">Checking authentication...</Text>
        <Spacer />
      </VStack>
    );
  }

  return (
    <VStack 
      display="flex" 
      width="100svw" 
      height="100svh" 
      alignItems="center" 
      justifyContent="center"
      p={6}
      backgroundColor={mainBackgroundColor}
      spacing={6}
    >
      {/* Header Section */}
      <VStack spacing={4} flexShrink={0} mb={5}>
        <Image 
          src={imageUrl} 
          width="700px"
          alt="SAGE3" 
          userSelect="none" 
          draggable={false} 
        />
      </VStack>

      {/* Main Action Section */}
      <VStack spacing={6} flexShrink={0} maxW="500px" width="100%">

        <Button 
          size="lg"
          height="70px"
          px={10}
          colorScheme="green" 
          onClick={openDesktopApp}
          fontSize="xl"
          fontWeight="bold"
          borderRadius="xl"
          boxShadow="lg"
          _hover={{
            transform: "scale(1.1) translateY(-8px)",
            boxShadow: "xl",
          }}
          transition="all 0.2s"
          flexDirection="column"
          gap={1}
          mb={5}
        >
          Open the SAGE3 Client
          <Text fontSize="sm" color="gray.600" textAlign="center" maxW="350px">
          For the best collaborative experience
        </Text>
        </Button>


      </VStack>

      {/* Links Section */}
      <VStack spacing={3} flexShrink={0} width="100%" maxW="500px">
        <HStack spacing={4} justifyContent="center" wrap="wrap">
          <Link isExternal href="https://sage3.sagecommons.org/?page_id=358">
            <Button variant="outline"  colorScheme="green"  size="sm" width="240px">
              Download the SAGE3 Client
            </Button>
          </Link>

          <Link isExternal href="https://sage3.sagecommons.org/?page_id=921">
            <Button variant="outline" colorScheme="green"  size="sm" width="240px">
              What is SAGE3?
            </Button>
          </Link>
        </HStack>

        <Divider />

        <Link href={sage3url}>
          <Button 
            variant="outline" 

            size="md"


            transition="all 0.2s"
            mt={5}
          >
            Continue in your browser
          </Button>
        </Link>
      </VStack>

      {/* Footer */}
      <VStack spacing={2} flexShrink={0}>
        <Text fontSize="sm" color="gray.500" textAlign="center">
          SAGE3 is funded by the following National Science Foundation awards: 2004014 | 2003800 | 2003387
        </Text>
      </VStack>
    </VStack>
  );
}

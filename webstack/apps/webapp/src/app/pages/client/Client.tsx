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
import { Button, useColorModeValue, Image, Text, VStack, Spacer, Box, Link, Flex, Icon, useToast } from '@chakra-ui/react';
import { FiExternalLink } from 'react-icons/fi';

// SAGE3
import { isElectron, useBoardStore, useHexColor, useRoomStore, useRouteNav } from '@sage3/frontend';

export function OpenDesktopPage() {
  // Navigation and routing
  const { roomId, boardId } = useParams();

  const mainBackgroundValue = useColorModeValue('gray.100', '#222222');
  const mainBackgroundColor = useHexColor(mainBackgroundValue);
  // SAGE3 Image
  // const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');
  const imageUrl = '/assets/sage3_banner.webp';

  const [sage3url, setSage3Url] = useState<string>('');

  const { toHome, toBoard } = useRouteNav();

  const joinRoomMembership = useRoomStore((state) => state.joinRoomMembership);
  const fetchRoom = useRoomStore((state) => state.fetchRoom);
  const fetchBoard = useBoardStore((state) => state.fetchBoard);

  const toast = useToast();

  const openDesktopApp = () => {
    if (!boardId || !roomId) return;
    // Get the board link
    const link = `sage3://${window.location.host}/#/enter/${roomId}/${boardId}`;
    // Open the link in the sage3 app
    window.open(link, '_self');
  };

  async function JoinBoard(roomId: string, boardId: string) {
    const room = await fetchRoom(roomId);
    const board = await fetchBoard(boardId);
    if (!room || !board) {
      // Toast user and go toHome
      toast({
        title: 'Error',
        description: 'Room or Board not found',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      toHome();
    }
    // Auto Join Room
    joinRoomMembership(roomId);
    toast({
      title: 'Joining Room and Board',
      description: (
        <>
          <p>Entering Room: {board?.data.name}</p>
          <p>Entering Board: {room?.data.name}</p>
        </>
      ),
      status: 'info',
      duration: null,
      isClosable: true,
    });
    toBoard(roomId, boardId);
  }

  useEffect(() => {
    if (!boardId || !roomId) return;
    // Get the board link
    const link = `${window.location.protocol}//${window.location.host}/#/board/${roomId}/${boardId}`;
    setSage3Url(link);

    // Stop this page from openeing in the Electron Client
    if (isElectron()) {
      if (boardId && roomId) {
        JoinBoard(roomId, boardId);
      } else {
        toHome();
      }
    }
  }, [roomId, boardId]);

  return (
    // Main Container
    <VStack display="flex" width="100svw" height="100svh" alignItems="center" p="3" backgroundColor={mainBackgroundColor}>
      <Spacer />
      <Image src={imageUrl} width="30%" alt="sage3" userSelect={'auto'} draggable={false} />
      <Spacer />
      <Button padding={'50px 50px 50px 50px'} colorScheme="green" onClick={openDesktopApp}>
        <Box>
          <Text fontSize={'3xl'}>Open the SAGE3 Client</Text>
        </Box>
      </Button>
      <Spacer />

      <VStack alignItems={'left'} fontSize={'2xl'}>
        <Link isExternal href="https://sage3.sagecommons.org/?page_id=358">
          <Flex>
            <Text>Get the SAGE3 client</Text>
            <Icon as={FiExternalLink} mt="5px" ml={2} />
          </Flex>
        </Link>

        <Link isExternal href="https://sage3.sagecommons.org/?page_id=921">
          <Flex>
            <Text>What is SAGE3?</Text>
            <Icon as={FiExternalLink} mt="5px" ml={2} />
          </Flex>
        </Link>
      </VStack>

      <Spacer />
      <Link href={sage3url}>
        <Flex>
          <Text>Continue in your browser</Text>
          <Icon as={FiExternalLink} mt="5px" ml={2} />
        </Flex>
      </Link>
      <Spacer />
      <footer>SAGE3 is funded by the following National Science Foundation awards: 2004014 | 2003800 | 2003387</footer>

      <Spacer />
    </VStack>
  );
}

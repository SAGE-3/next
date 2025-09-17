/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect } from 'react';
import { useParams } from 'react-router';
import {
  Text,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  IconButton,
  Flex,
  useDisclosure,
  Box,
  useColorModeValue,
} from '@chakra-ui/react';
import { LuPartyPopper } from 'react-icons/lu';

import { useHexColor, useRouteNav, useUser, useUsersStore } from '@sage3/frontend';
import { PartyHub, PartyInstance, usePartyStore } from './components';

interface PartyIconProps {
  iconSize?: 'xs' | 'sm' | 'md';
  isBoard?: boolean;
}

// Popover open state persisted across mounts
let popoverOpen = false;

/**
 * PartyButton: button that opens a popover showing party members & chat
 */
export function PartyButton(props: PartyIconProps): JSX.Element {
  // Chakra popover controls
  const { isOpen, onToggle, onClose, onOpen } = useDisclosure();

  // Keep popoverOpen flag in sync when entering/exiting routes
  useEffect(() => {
    if (popoverOpen) onOpen();
  }, [onOpen]);

  const handleOnToggle = () => {
    popoverOpen = !isOpen;
    onToggle();
  };
  const handleOnClose = () => {
    popoverOpen = false;
    onClose();
  };

  // Zustand stores and route helpers
  const { currentParty, partyMembers, setPartyBoard } = usePartyStore();
  const { users } = useUsersStore();
  const { user } = useUser();
  const { toBoard } = useRouteNav();

  // Get route params for board context
  const { boardId: routeBoardId, roomId: routeRoomId } = useParams();

  // Determine party size badge
  const partySize = partyMembers.filter((m) => m.party === currentParty?.ownerId).length;
  const ownerAccount = users.find((u) => u._id === currentParty?.ownerId);

  // Styling
  const iconSize = props.iconSize || 'md';
  const iconColor = 'teal';
  const fontSize = iconSize === 'xs' ? 'sm' : iconSize === 'sm' ? 'md' : 'lg';
  const badgeColor = useColorModeValue('red.500', 'red.200');
  const badgeHex = useHexColor(badgeColor);
  const badgeTextColor = useColorModeValue('white', 'black');
  const isOwner = currentParty?.ownerId === user?._id;

  /**
   * Owner: when boardId/roomId change, update party metadata
   */
  useEffect(() => {
    if (!isOwner || !currentParty) return;
    if (routeBoardId && routeRoomId) {
      // Only update if different than stored
      if (currentParty.board?.boardId !== routeBoardId || currentParty.board?.roomId !== routeRoomId) {
        setPartyBoard(routeBoardId, routeRoomId);
      }
    } else {
      // On homepage or missing params, clear board
      if (currentParty.board) {
        setPartyBoard(undefined, undefined);
      }
    }
    // Depend on exact board params and ownership
  }, [isOwner, currentParty, routeBoardId, routeRoomId, setPartyBoard]);

  /**
   * Non-owner: navigate to the owner's board when they change it
   * Guard to prevent infinite loops by checking current route
   */
  const targetBoard = currentParty?.board?.boardId;
  const targetRoom = currentParty?.board?.roomId;
  useEffect(() => {
    if (isOwner || !currentParty?.board) return;
    const { boardId: targetBoard, roomId: targetRoom } = currentParty.board;
    // Only navigate if route does not match target
    if (routeBoardId !== targetBoard || routeRoomId !== targetRoom) {
      toBoard(targetRoom, targetBoard);
    }
    // Include route params, currentParty.board, and toBoard
  }, [isOwner, targetBoard, targetRoom, routeBoardId, routeRoomId, toBoard, currentParty?.board]);

  // Popover header: show owner's name or generic
  const header = ownerAccount ? (
    `
      ${ownerAccount.data.name.trim().substring(0, 15)}'s Party
    `
  ) : (
    <Flex align="center" gap={2}>
      <Text fontSize="2xl" fontWeight="bold">
        <LuPartyPopper fontSize="24px" />
      </Text>
      <Text>Party</Text>
    </Flex>
  );

  return (
    <Popover isOpen={isOpen} onClose={handleOnClose} closeOnBlur={false} closeOnEsc>
      <PopoverTrigger>
        <Box position="relative">
          <IconButton
            onClick={handleOnToggle}
            size={iconSize}
            fontSize={fontSize}
            colorScheme={iconColor}
            icon={<LuPartyPopper fontSize="24px" />}
            aria-label="Party"
          />
          {currentParty && (
            <Box
              bg={badgeHex}
              borderRadius="full"
              w="16px"
              h="16px"
              pos="absolute"
              top="-4px"
              right="-4px"
              fontSize="10px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color={badgeTextColor}
            >
              {partySize}
            </Box>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent w="500px" h="500px" mr="2">
        <PopoverArrow />
        <PopoverCloseButton onClick={handleOnClose} />
        <PopoverHeader>{header}</PopoverHeader>
        <PopoverBody h="455px">
          <Party />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Party: decides whether to show the lobby (PartyHub) or live chat (PartyInstance)
 */
function Party(): JSX.Element {
  const { currentParty, initPartyConnection } = usePartyStore();
  const { user } = useUser();

  // Initialize connection once we know the user
  useEffect(() => {
    if (user) initPartyConnection(user);
  }, [user, initPartyConnection]);

  return currentParty ? <PartyInstance /> : <PartyHub />;
}

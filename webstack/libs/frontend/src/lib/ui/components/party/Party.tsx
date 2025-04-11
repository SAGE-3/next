/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React and Chakra Imports
import { useEffect } from 'react';
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
import { MdGroups } from 'react-icons/md';

// SAGE3 Imports
import { useHexColor, useRouteNav, useUser, useUsersStore } from '@sage3/frontend';

// Pary Imports
import { PartyHub, PartyInstance, usePartyStore } from './components';
import { useParams } from 'react-router';

interface PartyIconProps {
  iconSize?: 'xs' | 'sm' | 'md';
  isBoard?: boolean;
}

// Popover open state
let popoverOpen = false;

// The Partybutton Component.
// Contains the Popover with the party members and chat.
export function PartyButton(props: PartyIconProps): JSX.Element {
  // Popover control
  const { isOpen, onToggle, onClose, onOpen } = useDisclosure();

  // Popover open logic to keep it open when entering and exiting a board
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

  // Stores
  const { currentParty, partyMembers, setPartyBoard } = usePartyStore();
  const { users } = useUsersStore();
  const { user } = useUser();
  const { toBoard } = useRouteNav();

  // Values
  const partySize = partyMembers.filter((member) => member.party === currentParty?.ownerId).length;
  const ownerUserAccount = users.find((el) => el._id === currentParty?.ownerId);

  // Theme
  const iconSize = props.iconSize || 'md';
  const iconColor = 'teal';
  const isOwner = currentParty?.ownerId === user?._id;
  const badgeColor = useColorModeValue('red.500', 'red.200');
  const badgeHex = useHexColor(badgeColor);
  const badgeTextColor = useColorModeValue('white', 'black');

  const { boardId, roomId } = useParams();

  useEffect(() => {
    if (!isOwner) return;
    if (currentParty && boardId && roomId && currentParty.board?.boardId !== boardId) {
      setPartyBoard(boardId, roomId);
    }
  }, [currentParty, boardId, roomId, isOwner, setPartyBoard]);

  useEffect(() => {
    if (!currentParty || isOwner) return;
    if (currentParty && currentParty.board) {
      toBoard(currentParty.board.roomId, currentParty.board.boardId);
    }
  }, [currentParty, isOwner, toBoard]);

  // Popover Header. If you are in a party show the party owner's name. If not, show "Party Hub"
  const header = ownerUserAccount ? (
    `${ownerUserAccount.data.name.trim().substring(0, 15)}'s Party`
  ) : (
    <Flex alignItems="center" gap={2}>
      <Text fontSize="2xl" fontWeight="bold">
        <MdGroups />
      </Text>
      <Text>Party Hub</Text>
    </Flex>
  );
  const fontSize = iconSize === 'xs' ? 'sm' : iconSize === 'sm' ? 'md' : iconSize === 'md' ? 'lg' : 'xl';

  return (
    <Popover isOpen={isOpen} onClose={handleOnClose} closeOnBlur={false} closeOnEsc={true}>
      <PopoverTrigger>
        <Box>
          <IconButton
            onClick={handleOnToggle}
            size={iconSize}
            fontSize={fontSize}
            colorScheme={iconColor}
            icon={<MdGroups />}
            aria-label="Party"
          />
          {currentParty && (
            <Box
              backgroundColor={badgeHex}
              borderRadius="100%"
              width="16px"
              height="16px"
              position="absolute"
              right="-4px"
              top="-4px"
              fontSize="10px"
              display="flex"
              justifyContent={'center'}
              alignItems={'center'}
              color={badgeTextColor}
            >
              {partySize}
            </Box>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent width="500px" height="500px" mr="2">
        <PopoverArrow />
        <PopoverCloseButton onClick={handleOnClose} />
        <PopoverHeader>{header}</PopoverHeader>
        <PopoverBody height="455px">
          <Party />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

// The Party Component
// Contains the PartyHub and PartyInstance components.
function Party(): JSX.Element {
  const { currentParty } = usePartyStore();
  const { user } = useUser();

  const { initPartyConnection } = usePartyStore();
  useEffect(() => {
    if (user) {
      initPartyConnection(user);
    }
  }, [user, initPartyConnection]);

  if (!currentParty) {
    return <PartyHub />;
  }
  return <PartyInstance />;
}

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
} from '@chakra-ui/react';
import { MdGroups } from 'react-icons/md';

// SAGE3 Imports
import { useHexColor, useUser, useUsersStore } from '@sage3/frontend';

// Pary Imports
import { PartyHub, PartyInstance, usePartyStore } from './components';

interface PartyIconProps {
  iconSize?: 'xs' | 'sm' | 'md';
  isBoard?: boolean;
}

// The Partybutton Component.
// Contains the Popover with the party members and chat.
export function PartyButton(props: PartyIconProps): JSX.Element {
  // Stores
  const { currentParty, partyMembers } = usePartyStore();
  const { users } = useUsersStore();
  const { user } = useUser();

  // Values
  const partySize = partyMembers.filter((member) => member.party === currentParty?.ownerId).length;
  const ownerUserAccount = users.find((el) => el._id === currentParty?.ownerId);

  // Theme
  const iconSize = props.iconSize || 'md';
  const userColorValue = user?.data.color ? user.data.color : 'teal';
  const userColor = useHexColor(userColorValue);

  // Popover Header. If you are in a party show the party owner's name. If not, show "Party Hub"
  const header = ownerUserAccount ? (
    `${ownerUserAccount.data.name}'s Party`
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
    <Popover>
      <PopoverTrigger>
        {props.isBoard ? (
          <IconButton
            size={iconSize}
            fontSize={fontSize}
            colorScheme={userColorValue}
            icon={currentParty ? <Text>{partySize}</Text> : <MdGroups />}
            aria-label="Party"
          />
        ) : (
          <IconButton
            size={iconSize}
            fontSize={fontSize}
            backgroundColor={userColor}
            icon={currentParty ? <Text>{partySize}</Text> : <MdGroups />}
            aria-label="Party"
          />
        )}
      </PopoverTrigger>
      <PopoverContent width="500px" height="500px">
        <PopoverArrow />
        <PopoverCloseButton />
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

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
  Button,
  Text,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from '@chakra-ui/react';
import { MdGroup } from 'react-icons/md';

// SAGE3 Imports
import { useUser, useUsersStore } from '@sage3/frontend';

// Pary Imports
import { PartyHub, PartyInstance, usePartyStore } from './components';

interface PartyIconProps {
  iconSize?: 'xs' | 'sm' | 'md';
}

// The Partybutton Component.
// Contains the Popover with the party members and chat.
export function PartyButton(props: PartyIconProps): JSX.Element {
  // Stores
  const { currentParty, partyMembers } = usePartyStore();
  const { users } = useUsersStore();

  // Values
  const partySize = partyMembers.filter((member) => member.party === currentParty?.ownerId).length;
  const ownerUserAccount = users.find((el) => el._id === currentParty?.ownerId);

  // Theme
  const iconSize = props.iconSize || 'md';

  // Popover Header. If you are in a party show the party owner's name. If not, show "Party Hub"
  const header = ownerUserAccount ? `${ownerUserAccount.data.name}'s Party` : 'Party Hub';

  return (
    <Popover>
      <PopoverTrigger>
        <Button
          width="100px"
          size={iconSize}
          colorScheme={currentParty ? 'teal' : 'gray'}
          leftIcon={currentParty ? <Text>{partySize}</Text> : <MdGroup />}
        >
          Party
        </Button>
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

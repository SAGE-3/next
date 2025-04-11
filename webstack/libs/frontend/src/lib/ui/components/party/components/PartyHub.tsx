/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Button, VStack, HStack, Text, Flex, Divider, useColorModeValue, IconButton, Tooltip, Box } from '@chakra-ui/react';

// SAGE3 Imports
import { useUsersStore } from '@sage3/frontend';

// Party Imports
import { usePartyStore } from '././PartyStore';
import { MdAdd } from 'react-icons/md';

export function PartyHub(): JSX.Element {
  // Store imports
  const { parties, partyMembers, setCurrentParty, createParty } = usePartyStore();

  // Users imports
  const { users } = useUsersStore();

  // Theme
  const scrollBarGripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

  // List of all current parties
  // This is a list of all the parties that are currently active. Has a user connected to it.
  const partyList = partyMembers
    .map((member) => {
      return member.party ? member.party : null;
    })
    .filter((party) => party !== null);
  // Remove duplicates from the partyList
  const uniqueParties = Array.from(new Set(partyList));
  // Does the party really exist?
  const availableParties = parties.filter((party) => {
    return uniqueParties.includes(party.ownerId);
  });

  return (
    <Flex direction="column" height="100%">
      <Flex direction="column" gap={4} align="stretch" flex={1} overflowY="auto">
        <Flex
          direction={'column'}
          gap={4}
          align="stretch"
          flex={1}
          overflowY="scroll"
          pr="2"
          css={{
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: scrollBarGripColor,
              borderRadius: 'md',
            },
          }}
        >
          {availableParties.length === 0 && <Text>No Parties currently available. Please create one below.</Text>}
          {availableParties.map((party) => {
            const owner = users.find((el) => el._id === party.ownerId);
            const ownerName = owner ? owner.data.name : 'Unknown';
            const email = owner ? owner.data.email : 'Unknown';
            const count = partyMembers.filter((member) => member.party === party?.ownerId).length;
            return (
              <HStack key={party.ownerId} justify="space-between">
                <HStack>
                  <Text fontSize="xl"> {count}</Text>
                  <VStack align="start" gap="0">
                    <Text fontSize="sm" fontWeight="bold">
                      {ownerName}'s Party
                    </Text>
                    <Text fontSize="xs">{email}</Text>
                  </VStack>
                </HStack>
                <Button size="sm" onClick={() => setCurrentParty(party)} colorScheme="teal">
                  Join
                </Button>
              </HStack>
            );
          })}
        </Flex>
      </Flex>
      <Flex flexDir="column" mt="auto" width="100%">
        <Divider my="2" />
        <HStack justify="space-between" align="center">
          <Box></Box>
          <Tooltip label="Create a new party" placement="top" hasArrow>
            <IconButton size="sm" icon={<MdAdd />} aria-label="Create Party" onClick={createParty} colorScheme="teal" />
          </Tooltip>
        </HStack>
      </Flex>
    </Flex>
  );
}

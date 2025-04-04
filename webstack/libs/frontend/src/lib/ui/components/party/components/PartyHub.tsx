/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Button, VStack, HStack, Text, Flex, Divider, useColorModeValue } from '@chakra-ui/react';

// SAGE3 Imports
import { useUsersStore } from '@sage3/frontend';

// Party Imports
import { usePartyStore } from '././PartyStore';

export function PartyHub(): JSX.Element {
  const { parties, partyMembers, setCurrentParty, createParty } = usePartyStore();
  const { users } = useUsersStore();

  // List of all current parties
  const partyList = partyMembers
    .map((member) => {
      return member.party ? member.party : null;
    })
    .filter((party) => party !== null);
  const uniqueParties = Array.from(new Set(partyList));
  const availableParties = parties.filter((party) => {
    return uniqueParties.includes(party.ownerId);
  });
  // Theme
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

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
              background: gripColor,
              borderRadius: 'md',
            },
          }}
        >
          {availableParties.length === 0 && <Text>Looks like there aren't any parties right now.</Text>}
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
        <HStack>
          <Button size="sm" onClick={createParty}>
            Create Party
          </Button>
        </HStack>
      </Flex>
    </Flex>
  );
}

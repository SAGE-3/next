import { useState, useEffect } from 'react';
import {
  Button,
  Heading,
  Input,
  VStack,
  HStack,
  Text,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Flex,
  Tooltip,
  Box,
  Divider,
} from '@chakra-ui/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { create } from 'zustand';
import { useUser, useUsersStore } from '@sage3/frontend';
import { Awareness } from 'y-protocols/awareness';
import { MdExitToApp, MdGroup } from 'react-icons/md';
import { genId } from '@sage3/shared';
import { User } from '@sage3/shared/types';

// Party type definition
type Party = {
  ownerId: string;
};

type PartyMember = {
  userId: string;
  party: string | null;
};

type PartyStore = {
  parties: Party[];
  currentParty: Party | null;
  partyMembers: PartyMember[];
  yDoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  awareness: Awareness | null;
  initAwareness: (user: User) => void;
  setParties: (parties: Party[]) => void;
  setCurrentParty: (party: Party | null) => void;
  joinParty: (party: Party) => void;
  leaveParty: () => void;
  createParty: () => void;
};

let USER: User | null = null;

const usePartyStore = create<PartyStore>((set, get) => {
  function initAwareness(user: User) {
    const { provider } = get();
    if (provider) {
      // If the provider is already initialized we need to do nothing
    }
    USER = user;
    const yDoc = new Y.Doc();
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/yjs`;
    const p = new WebsocketProvider(url, 'partyHub', yDoc);
    const awareness = p.awareness;

    p.on('sync', () => {
      set({ parties: Array.from(yDoc.getMap<Party>('parties').values()) });
      yDoc.getMap<Party>('parties').observe(() => {
        set({ parties: Array.from(yDoc.getMap<Party>('parties').values()) });
      });
      set({ provider: p, yDoc, awareness });
    });

    awareness.on('change', () => {
      const userData = Array.from(awareness.getStates().values());
      const usersMaped = userData.map((el) => {
        const user = el as PartyMember;
        return user;
      });
      set({ partyMembers: usersMaped });
    });

    awareness.setLocalState({ userId: user._id, party: null });
  }

  return {
    parties: [],
    currentParty: null,
    partyMembers: [],
    yDoc: null,
    provider: null,
    awareness: null,
    initAwareness,
    setParties: (parties) => set({ parties }),
    setCurrentParty: (party) => {
      if (party) {
        const { awareness } = get();
        if (!awareness) return;
        awareness.setLocalState({ userId: USER!._id, party: party.ownerId });
        console.log('Updated local state:', awareness.getLocalState());
      }
      set({ currentParty: party });
    },

    joinParty: (party) => get().setCurrentParty(party),
    leaveParty: () => {
      const { awareness } = get();
      if (!awareness) return;
      awareness.setLocalState({ userId: USER!._id, party: null });
      set({ currentParty: null });
    },
    createParty: () => {
      const { provider, setCurrentParty } = get();
      const party: Party = { ownerId: USER!._id };
      provider?.doc.getMap('parties').set(party.ownerId, party);
      setCurrentParty(party);
    },
  };
});

export default usePartyStore;

interface PartyIconProps {
  iconSize?: 'xs' | 'sm' | 'md';
}

export function PartyIcon(props: PartyIconProps): JSX.Element {
  const iconSize = props.iconSize || 'md';
  const { currentParty, partyMembers } = usePartyStore();
  const count = partyMembers.filter((member) => member.party === currentParty?.ownerId).length;
  return (
    <Popover>
      <PopoverTrigger>
        <Button size={iconSize} colorScheme={'teal'} leftIcon={<MdGroup />}>
          Party - {count}
        </Button>
      </PopoverTrigger>
      <PopoverContent width="500px" height="500px">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader>Party</PopoverHeader>
        <PopoverBody height="100%">
          <Party />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

export function Party(): JSX.Element {
  const { currentParty } = usePartyStore();
  const { user } = useUser();

  const { initAwareness } = usePartyStore();
  useEffect(() => {
    if (user) {
      initAwareness(user);
    }
  }, [user, initAwareness]);

  if (!currentParty) {
    return <PartyHub />;
  }
  return <PartyInstance />;
}

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

  return (
    <Flex direction="column" height="90%">
      <Text fontSize="lg" mb="4">
        Available Parties
      </Text>
      <Flex direction="column" gap={4} align="stretch" flex={1} overflowY="auto">
        <Flex direction={'column'} gap={4} align="stretch" flex={1} overflowY="scroll" pr="2">
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
                      {ownerName}
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
          <Tooltip label="Create a new party" placement="top">
            <Button size="sm" onClick={createParty} colorScheme="teal" fontSize="lg">
              +
            </Button>
          </Tooltip>
        </HStack>
      </Flex>
    </Flex>
  );
}

export function PartyInstance(): JSX.Element {
  const { leaveParty, partyMembers, currentParty } = usePartyStore();
  const { users } = useUsersStore();

  if (!currentParty) {
    return <Text>Loading...</Text>;
  }
  const members = partyMembers.filter((member) => member.party === currentParty.ownerId).map((member) => member.userId);

  return (
    <Flex direction="column" height="100%">
      <Flex direction="column" gap={4} align="stretch" flex={1} overflowY="auto">
        <Text fontSize="lg"> Party Members</Text>
        {members.map((member) => {
          const u = users.find((el) => el._id === member);
          const name = u ? u.data.name : 'Unknown';
          const email = u ? u.data.email : 'Unknown';
          const color = u ? u.data.color : 'gray.500';
          return (
            <VStack align="start" gap="0" key={member}>
              <Text fontSize="sm" fontWeight="bold">
                {name}
              </Text>
              <Text fontSize="xs">{email}</Text>
            </VStack>
          );
        })}
      </Flex>
      <Flex flexDir="column" mt="auto" width="100%">
        <Divider my="2" />
        <HStack>
          <Tooltip label="Leave Party" placement="top">
            <Button size="sm" fontSize="xl" onClick={leaveParty} colorScheme="red">
              <MdExitToApp />
            </Button>
          </Tooltip>
        </HStack>
      </Flex>
    </Flex>
  );
}

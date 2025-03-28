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
import { MdGroup } from 'react-icons/md';

// Party type definition
type Party = {
  ownerId: string;
  name: string;
};

type PartyStore = {
  parties: Party[];
  currentParty: Party | null;
  setParties: (parties: Party[]) => void;
  setCurrentParty: (party: Party | null) => void;
};

// Zustand store for managing party state with type annotations
const usePartyStore = create<PartyStore>((set) => ({
  parties: [],
  currentParty: null,
  setParties: (parties: Party[]) => set({ parties }),
  setCurrentParty: (party: Party | null) => set({ currentParty: party }),
}));

interface PartyIconProps {
  iconSize?: 'xs' | 'sm' | 'md';
}

export function PartyIcon(props: PartyIconProps): JSX.Element {
  const iconSize = props.iconSize || 'md';
  return (
    <Popover>
      <PopoverTrigger>
        <Button size={iconSize} colorScheme={'teal'} leftIcon={<MdGroup />}>
          Party
        </Button>
      </PopoverTrigger>
      <PopoverContent width="500px" height="500px">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader>Party</PopoverHeader>
        <PopoverBody>
          <Party />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

// Party Component
export function Party() {
  const [yDoc] = useState(new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const { currentParty } = usePartyStore();

  useEffect(() => {
    // Check if the protocol is https or http
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Create the url to connect to the Yjs server
    const url = `${protocol}://${window.location.host}/yjs`;
    const newProvider = new WebsocketProvider(url, 'partyHub', yDoc);
    setProvider(newProvider);
    return () => newProvider.destroy();
  }, [yDoc]);

  if (!currentParty) {
    return <PartyHub provider={provider} />;
  }
  return <PartyInstance provider={provider} />;
}

// PartyHub Component
export function PartyHub({ provider }: { provider: WebsocketProvider | null }) {
  const { parties, setParties, setCurrentParty } = usePartyStore();
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useUser();

  const { users } = useUsersStore();

  useEffect(() => {
    if (provider) {
      const awareness = new Awareness(provider.doc);
      const partiesMap = provider.doc.getMap<Party>('parties');

      awareness.setLocalState({ userId: user!._id, party: null });

      partiesMap.observe(() => {
        setParties(Array.from(partiesMap.values()));
      });
    }
  }, [provider, setParties, user!._id]);

  const createParty = () => {
    const partyName = prompt('Enter party name:');
    if (partyName) {
      const party: Party = { name: partyName, ownerId: user!._id };
      provider?.doc.getMap('parties').set(user!._id, party);
      setCurrentParty(party);
    }
  };

  const joinParty = (party: Party) => {
    setCurrentParty(party);
  };

  // Filter the parties and sort by name
  const filteredParties = parties.filter((party) => party.name.includes(searchTerm)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Flex direction="column" height="100%" overflow="hidden">
      {/* VStack for filtered parties */}
      <VStack
        spacing={4}
        align="stretch"
        flex="1"
        overflowY="auto" // Enable scrolling
      >
        {filteredParties.map((party) => {
          const owner = users.find((el) => el._id === party.ownerId);
          const ownerName = owner ? owner.data.name : 'Unknown';
          const email = owner ? owner.data.email : 'Unknown';
          return (
            <HStack key={party.name} justify="space-between">
              <VStack align="start" gap="0">
                <Text fontSize="sm" fontWeight="bold">
                  {ownerName}
                </Text>
                <Text fontSize="xs">{email}</Text>
              </VStack>
              <Button size="sm" onClick={() => joinParty(party)} colorScheme="teal">
                Join
              </Button>
            </HStack>
          );
        })}
      </VStack>

      {/* HStack for the input and button fixed to the bottom */}
      <Box position="absolute" bottom="0" mb={2} width="100%">
        <Divider />
        <HStack>
          <Tooltip label="Create a new party" placement="top">
            <Button size="sm" onClick={createParty} colorScheme="teal" fontSize="lg">
              +
            </Button>
          </Tooltip>
          <Input size="sm" placeholder="Search for a party..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </HStack>
      </Box>
    </Flex>
  );
}

// PartyInstance Component
export function PartyInstance({ provider }: { provider: WebsocketProvider | null }) {
  const { currentParty, setCurrentParty } = usePartyStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const { user } = useUser();

  useEffect(() => {
    if (provider && currentParty) {
      // Set up awareness to track user presence and state
      const awareness = new Awareness(provider.doc);

      // Listen for updates to the awareness state
      awareness.on('change', () => {
        const userData = awareness.getStates();
        const currentMembers = Array.from(userData.values())
          .filter((state) => state.party === currentParty.ownerId)
          .map((state) => state.userId);
        console.log('Current members:', currentMembers);
        setMembers(currentMembers);
      });

      // When a user connects, add them to the awareness state
      awareness.setLocalState({
        userId: user!._id,
        party: currentParty.ownerId,
      });
    }
  }, [provider, currentParty, user]);

  if (!currentParty) return <Text>No party selected</Text>;

  const leaveParty = () => {
    if (!provider) return;
    if (members.length === 1) {
      provider?.doc.getMap('parties').delete(currentParty.ownerId);
    }
    // Set up awareness to track user presence and state
    const awareness = new Awareness(provider?.doc);
    // Remove the user from the awareness state
    // When a user connects, add them to the awareness state
    awareness.setLocalState({
      userId: user!._id,
      party: null,
    });
    // Remove the user from the members list
    setCurrentParty(null);
  };

  return (
    <VStack spacing={4} align="stretch">
      <Text>{currentParty.name}</Text>
      {members.map((member) => (
        <Text key={member}>{member}</Text>
      ))}
      <HStack>
        <Button size="xs" onClick={leaveParty}>
          Leave Party
        </Button>
        <Input placeholder="Search members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </HStack>
    </VStack>
  );
}

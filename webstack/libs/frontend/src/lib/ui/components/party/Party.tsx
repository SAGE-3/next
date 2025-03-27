/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Button,
  Flex,
  Box,
  Heading,
  Input,
  VStack,
} from '@chakra-ui/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useState } from 'react';
import { genId } from '@sage3/shared';
import { create } from 'zustand';

interface PartyProps {
  iconSize?: 'xs' | 'sm' | 'md';
  colorScheme: string;
}

export function PartyIcon(props: PartyProps): JSX.Element {
  const iconSize = props.iconSize || 'md';
  const colorScheme = props.colorScheme;
  return (
    <Popover>
      <PopoverTrigger>
        <Button size={iconSize} colorScheme={colorScheme}>
          Party
        </Button>
      </PopoverTrigger>
      <PopoverContent width="500px" height="500px">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader>Party</PopoverHeader>
        <PartyContent />
      </PopoverContent>
    </Popover>
  );
}

type PartyStore = {
  currentParty: string | null;
  parties: string[];
  setParties: (parties: string[]) => void;
  joinParty: (party: string) => void;
  leaveParty: () => void;
};

const usePartyStore = create<PartyStore>((set) => ({
  currentParty: null,
  parties: [],
  setParties: (parties) => set({ parties }),
  joinParty: (party) => set({ currentParty: party }),
  leaveParty: () => set({ currentParty: null }),
}));

function PartyContent(): JSX.Element {
  const { currentParty, parties, setParties, joinParty, leaveParty } = usePartyStore();
  const [newPartyName, setNewPartyName] = useState<string>('');
  const [doc] = useState<Y.Doc>(new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  useEffect(() => {
    // Check if the protocol is https or http
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Create the url to connect to the Yjs server
    const url = `${protocol}://${window.location.host}/yjs`;
    const wsProvider = new WebsocketProvider(url, 'party-hub', doc);
    wsProvider.on('status', (event: { status: string }) => console.log('WebSocket status:', event.status));

    const partyList = doc.getArray<string>('parties');
    partyList.observe(() => setParties([...partyList]));

    setProvider(wsProvider);
    return () => wsProvider.destroy();
  }, [doc, setParties]);

  const createParty = () => {
    if (!newPartyName.trim()) return;
    const partyList = doc.getArray<string>('parties');
    partyList.push([newPartyName]);
    setNewPartyName('');
  };

  const joinExistingParty = (party: string) => {
    if (currentParty) leaveParty();
    joinParty(party);
  };

  return (
    <Box p={4}>
      {!currentParty ? (
        <VStack spacing={4} mt={4} align="stretch">
          <Input value={newPartyName} onChange={(e) => setNewPartyName(e.target.value)} placeholder="Enter party name" size="sm" />
          <Button onClick={createParty} colorScheme="blue" size="sm">
            Create Party
          </Button>
          <VStack spacing={2} align="stretch">
            {parties.map((party, index) => (
              <Button key={index} onClick={() => joinExistingParty(party)} colorScheme="teal" size="sm">
                {party}
              </Button>
            ))}
          </VStack>
        </VStack>
      ) : (
        <VStack spacing={4} mt={4}>
          <Heading size="md">You are in: {currentParty}</Heading>
          <Button onClick={leaveParty} colorScheme="red" size="sm">
            Leave Party
          </Button>
        </VStack>
      )}
    </Box>
  );
}

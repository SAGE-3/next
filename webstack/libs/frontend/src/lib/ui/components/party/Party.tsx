import { useState, useEffect, useRef } from 'react';
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
  useColorModeValue,
  IconButton,
  Tabs,
  TabPanels,
  TabPanel,
  Tab,
  TabList,
} from '@chakra-ui/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { create } from 'zustand';
import { serverTime, useHexColor, useUser, useUsersStore } from '@sage3/frontend';
import { Awareness } from 'y-protocols/awareness';
import { MdControlPoint, MdExitToApp, MdFollowTheSigns, MdGroup, MdWallet } from 'react-icons/md';
import { genId } from '@sage3/shared';
import { User } from '@sage3/shared/types';
import { useParams } from 'react-router';
import { FaCrown } from 'react-icons/fa';

type Chat = {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
};

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
  chats: Chat[];
  provider: WebsocketProvider | null;
  awareness: Awareness | null;
  setChats: (party: Party) => void;
  addChat: (message: string) => Promise<void>;
  clearChat: (party: Party) => void;
  initAwareness: (user: User) => void;
  setParties: (parties: Party[]) => void;
  setCurrentParty: (party: Party | null) => void;
  joinParty: (party: Party) => void;
  leaveParty: () => void;
  createParty: () => void;
  disbandParty: () => void;
};

let USER: User | null = null;

const usePartyStore = create<PartyStore>((set, get) => {
  function initAwareness(user: User) {
    const { provider } = get();
    if (provider) {
      // If the provider is already initialized we need to do nothing
      console.log('Provider already initialized');
      return;
    }
    USER = user;
    const yDoc = new Y.Doc();
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/yjs`;
    const p = new WebsocketProvider(url, 'partyHub', yDoc);
    const awareness = p.awareness;
    set({ provider: p, yDoc, awareness });

    p.on('sync', () => {
      const currentParties = Array.from(yDoc.getMap<Party>('parties').values());
      set({ parties: currentParties });

      // If you have a party already created, set it as the current party
      const partyAlreadyCreated = currentParties.find((party) => party.ownerId === user._id);
      if (partyAlreadyCreated) {
        get().setCurrentParty(partyAlreadyCreated);
      } else {
        set({ currentParty: null });
      }

      yDoc.getMap<Party>('parties').observe(() => {
        const currentParties = Array.from(yDoc.getMap<Party>('parties').values());
        // When a party is created or removed, update the parties list
        set({ parties: currentParties });

        // If you are in a party and that party has been removed, leave the party
        const { currentParty } = get();
        if (currentParty) {
          const party = currentParties.find((party) => party.ownerId === currentParty.ownerId);
          if (!party) {
            set({ currentParty: null });
            awareness.setLocalState({ userId: user._id, party: null });
          }
        }
      });
    });

    awareness.on('change', () => {
      const userData = Array.from(awareness.getStates().values());
      const usersMaped = userData.map((el) => {
        const user = el as PartyMember;
        return user;
      });
      console.log('Users:', usersMaped);
      set({ partyMembers: usersMaped });
    });
  }

  return {
    parties: [],
    currentParty: null,
    partyMembers: [],
    yDoc: null,
    chats: [],
    provider: null,
    awareness: null,
    initAwareness,
    setParties: (parties) => set({ parties }),
    setChats: (party: Party) => {
      const { yDoc } = get();
      if (!yDoc) return;
      const chats = yDoc.getArray<Chat>(party.ownerId).toArray();
      set({ chats });
      yDoc.getArray<Chat>(party.ownerId).observe((event) => {
        const chats = yDoc.getArray<Chat>(party.ownerId).toArray();
        // Sort in descending order
        chats.sort((a, b) => a.timestamp - b.timestamp);
        // Set the chats in the store
        set({ chats });
      });
    },
    async addChat(message: string) {
      const { currentParty } = get();
      if (!currentParty) return;
      const { yDoc } = get();
      if (!yDoc) return;
      const chats = yDoc.getArray<Chat>(currentParty.ownerId);
      const timestamp = await serverTime();
      const chat: Chat = {
        id: genId(),
        text: message,
        senderId: USER!._id,
        timestamp: timestamp.epoch,
      };
      chats.push([chat]);
    },
    clearChat: (party: Party) => {
      const { yDoc } = get();
      if (!yDoc) return;
      const chats = yDoc.getArray<Chat>(party.ownerId);
      chats.delete(0, chats.length);
    },
    setCurrentParty: (party) => {
      if (party) {
        const { awareness, setChats } = get();
        if (!awareness) return;
        awareness.setLocalState({ userId: USER!._id, party: party.ownerId });
        set({ currentParty: party });
        setChats(party);
      }
    },
    joinParty: (party) => get().setCurrentParty(party),
    leaveParty: () => {
      const { awareness } = get();
      if (!awareness) return;
      awareness.setLocalState({ userId: USER!._id, party: null });
      set({ currentParty: null, chats: [] });
    },
    createParty: () => {
      const { provider, setCurrentParty } = get();
      const party: Party = { ownerId: USER!._id };
      provider?.doc.getMap('parties').set(USER!._id, party);
      setCurrentParty(party);
    },
    disbandParty: () => {
      if (!USER) return;
      const { provider, leaveParty } = get();
      provider?.doc.getMap('parties').delete(USER._id);
      set({ currentParty: null });
      get().clearChat({ ownerId: USER._id });
      leaveParty();
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
  const { users } = useUsersStore();
  const partySize = partyMembers.filter((member) => member.party === currentParty?.ownerId).length;
  const ownerUserAccount = users.find((el) => el._id === currentParty?.ownerId);

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

export function PartyInstance(): JSX.Element {
  const { leaveParty, partyMembers, currentParty, disbandParty, chats, addChat } = usePartyStore();
  const { users } = useUsersStore();
  const { user } = useUser();

  const { boardId, roomId } = useParams();

  const isOwner = currentParty?.ownerId === user?._id;
  // Theme
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

  const yellowHex = useHexColor('yellow.400');

  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    if (!scrollRef.current) return;
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  };
  useEffect(() => {
    scrollToBottom();
  }, [chats, scrollRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents new line in the input field
      handleSendMessage();
    }
  };

  async function handleSendMessage() {
    // You can add the new message to the array of chats if needed.
    if (newMessage.trim()) {
      addChat(newMessage);
      setNewMessage('');
      scrollToBottom();
    }
  }

  if (!currentParty) {
    return <Text>Loading...</Text>;
  }
  const members = partyMembers.filter((member) => member.party === currentParty.ownerId).map((member) => member.userId);
  // Move the party owner to the top
  const ownerIndex = members.indexOf(currentParty.ownerId);
  if (ownerIndex !== -1) {
    members.splice(ownerIndex, 1);
    members.unshift(currentParty.ownerId);
  }

  const setPartyBoard = () => {
    console.log('Set party board');
    console.log('boardId', boardId);
    console.log('roomId', roomId);
  };

  const present = () => {
    console.log('Present');
  };

  return (
    <Flex direction="column" height="100%">
      <Tabs height="100%">
        <TabList>
          <Tab>Members</Tab>
          <Tab>Chat</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <Flex
              height="300px"
              direction="column"
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
              {members.map((member) => {
                const u = users.find((el) => el._id === member);
                const name = u ? u.data.name : 'Unknown';
                const email = u ? u.data.email : 'Unknown';
                const color = u ? u.data.color : 'gray.500';
                const isOwner = u ? u._id === currentParty?.ownerId : false;
                return (
                  <HStack justify={'space-between'} key={member}>
                    <VStack align="start" gap="0" key={member}>
                      <Text fontSize="sm" fontWeight="bold">
                        {name}
                      </Text>
                      <Text fontSize="xs">{email}</Text>
                    </VStack>
                    {isOwner && <FaCrown color={yellowHex} />}
                  </HStack>
                );
              })}
            </Flex>
          </TabPanel>
          <TabPanel height="100%">
            {/* Chat History */}
            <VStack
              height="275px"
              flex={1}
              spacing={3}
              align="stretch"
              overflowY="scroll"
              pr="2"
              mb="2"
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
              ref={scrollRef}
            >
              {chats.map((chat) => {
                const u = users.find((el) => el._id === chat.senderId);
                const name = u ? u.data.name : 'Unknown';
                const time = new Date(chat.timestamp);
                // Formatted time showing date and time. Only show date if the message is older than today
                const today = new Date();
                const isToday = time.toDateString() !== today.toDateString();
                const formattedTime = isToday
                  ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : time.toLocaleDateString([], {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                return (
                  <Flex key={chat.id} direction={chat.senderId === user!._id ? 'row-reverse' : 'row'}>
                    <Box
                      padding="5px"
                      borderRadius="md"
                      maxWidth="80%"
                      backgroundColor={chat.senderId === user!._id ? 'blue.500' : 'gray.200'}
                      color={chat.senderId === user!._id ? 'white' : 'black'}
                      boxShadow="md"
                      display={'flex'}
                      flexDir={'column'}
                    >
                      <Text fontSize="xs">
                        {name} - {formattedTime}
                      </Text>

                      <Text fontWeight="bold">{chat.text}</Text>
                    </Box>
                  </Flex>
                );
              })}
            </VStack>

            {/* Message Input */}
            <Flex align="center">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                size="sm"
                flex="1"
              />
              <Button onClick={handleSendMessage} colorScheme="blue" borderRadius="full" marginLeft="10px" size="sm">
                Send
              </Button>
            </Flex>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Flex flexDir="column" mt="auto" width="100%">
        <Divider my="2" />
        <HStack justify="space-between">
          <HStack>
            <Button size="sm" onClick={present}>
              Present
            </Button>
            <Button size="sm" onClick={setPartyBoard}>
              Set Board
            </Button>
            <Button size="sm" onClick={setPartyBoard}>
              Clear Chat
            </Button>
          </HStack>
          <HStack>
            {isOwner ? (
              <Button size="sm" onClick={disbandParty} colorScheme="red">
                Disband
              </Button>
            ) : (
              <Button size="sm" onClick={leaveParty} colorScheme="red">
                Leave
              </Button>
            )}
          </HStack>
        </HStack>
      </Flex>
    </Flex>
  );
}

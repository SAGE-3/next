/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Input,
  VStack,
  HStack,
  Text,
  Flex,
  Box,
  Divider,
  useColorModeValue,
  Tabs,
  TabPanels,
  TabPanel,
  Tab,
  TabList,
  IconButton,
  Tooltip,
  Badge,
} from '@chakra-ui/react';
import { FaCrown } from 'react-icons/fa';
import { ImExit } from 'react-icons/im';

// SAGE3 Imports
import { useBoardStore, useHexColor, usePresenceStore, useUser, useUsersStore } from '@sage3/frontend';

// Party Imports
import { usePartyStore } from './PartyStore';
import { MdClose, MdDelete, MdSend } from 'react-icons/md';
import { Board, Presence } from '@sage3/shared/types';

export function PartyInstance(): JSX.Element {
  // Store imports
  const { leaveParty, partyMembers, currentParty, disbandParty, chats } = usePartyStore();
  const { user } = useUser();
  const fetchBoard = useBoardStore((state) => state.fetchBoard);
  const [board, setBoard] = useState<Board | undefined>(undefined);

  // Fetch the board when the component mounts
  useEffect(() => {
    if (currentParty && currentParty.board) {
      if (board && board._id === currentParty.board.boardId) return;
      fetchBoard(currentParty.board.boardId).then((boardData) => {
        if (!boardData) return;
        setBoard(boardData);
      });
    }
  }, [board, currentParty, fetchBoard]);

  // Is this user the owner of the party?
  const isOwner = currentParty?.ownerId === user?._id;
  const partySize = partyMembers.filter((member) => member.party === currentParty?.ownerId).length;
  const chatSize = chats.length;

  // Theme
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

  return (
    <Flex direction="column" height="100%">
      <Tabs height="100%">
        <TabList>
          <Tab>Members ({partySize})</Tab>
          <Tab>Chat ({chatSize})</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px="0">
            <PartyMembersList members={members} />
          </TabPanel>
          <TabPanel height="100%" px="0">
            <PartyChats />
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Flex flexDir="column" mt="auto" width="100%">
        <Divider mb="2" />
        <HStack justify="space-between" align="center">
          <HStack flex="1" justify="flex-start">
            <Tooltip label="Board Name" placement="top" hasArrow>
              <Badge
                colorScheme={board ? board.data.color : 'teal'}
                fontSize="sm"
                px="2"
                py="1"
                borderRadius="md"
                variant="subtle"
                maxWidth="200px"
                userSelect={'none'}
              >
                {board ? board.data.name : 'No Board'}
              </Badge>
            </Tooltip>
          </HStack>

          <HStack flex="1" justify="flex-end">
            {isOwner ? (
              <Tooltip label="Disband Party" placement="top" hasArrow>
                <IconButton size="sm" icon={<MdClose />} aria-label="Clear Chats" onClick={disbandParty} colorScheme="red" />
              </Tooltip>
            ) : (
              <Tooltip label="Leave Party" placement="top" hasArrow>
                <IconButton size="sm" icon={<ImExit />} aria-label="Clear Chats" onClick={leaveParty} colorScheme="red" />
              </Tooltip>
            )}
          </HStack>
        </HStack>
      </Flex>
    </Flex>
  );
}

// Party Members List
function PartyMembersList(props: { members: string[] }): JSX.Element {
  // Stores
  const { users } = useUsersStore();
  const { currentParty } = usePartyStore();
  const presence = usePresenceStore((state) => state.partialPrescences);

  // Map the members to the users
  const members = props.members
    .map((member) => {
      const u = users.find((el) => el._id === member);
      if (!u) return null;
      const presenceData = presence.find((el) => el._id === member) as Presence | undefined;
      return {
        ...u,
        presence: presenceData,
      };
    })
    .filter((member) => member !== null);

  // Theme
  const yellowHex = useHexColor('yellow.400');
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

  return (
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
        const name = member.data.name;
        const email = member.data.email;
        const isOwner = member._id === currentParty?.ownerId;
        return (
          <HStack justify={'space-between'} key={member._id}>
            <VStack align="start" gap="0">
              <Text fontSize="sm" fontWeight="bold">
                {name}
              </Text>
              <Text fontSize="xs">{email}</Text>
            </VStack>
            <HStack></HStack>
            {isOwner && <FaCrown color={yellowHex} />}
          </HStack>
        );
      })}
    </Flex>
  );
}

function PartyChats(): JSX.Element {
  const { chats, addChat, clearChat, currentParty } = usePartyStore();
  const { users } = useUsersStore();
  const { user } = useUser();

  // Is this user the owner of the party?
  const isOwner = currentParty?.ownerId === user?._id;

  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');
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

  const handleClearChat = () => {
    console.log('Clear chat');
    if (!currentParty) return;
    clearChat(currentParty);
  };
  return (
    <>
      <VStack
        height="280px"
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
          let name = (u ? u.data.name : 'Unknown').substring(0, 12);
          name = name.length >= 12 ? name.concat('...') : name;
          const time = new Date(chat.timestamp);
          // Formatted time showing date and time. Only show date if the message is older than today
          const today = new Date();
          const isToday = time.toDateString() === today.toDateString();
          const yours = chat.senderId === user!._id;
          const formattedTime = isToday
            ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : time.toLocaleDateString([], {
                hour: '2-digit',
                minute: '2-digit',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              });

          return (
            <Flex key={chat.id} direction={yours ? 'row-reverse' : 'row'}>
              <Box display="flex" flexDir="column" maxWidth="80%">
                <Box textAlign={yours ? 'right' : 'left'}>
                  <Text fontSize="xs">
                    {!yours && name} {formattedTime}
                  </Text>
                </Box>
                <Box
                  borderRadius="lg"
                  py="3px"
                  px="7px"
                  backgroundColor={yours ? 'blue.300' : 'gray.200'}
                  color={yours ? 'black' : 'black'}
                  boxShadow="md"
                  display={'flex'}
                  flexDir={'column'}
                >
                  <Text fontSize="sm">{chat.text}</Text>
                </Box>
              </Box>
            </Flex>
          );
        })}
      </VStack>

      {/* Message Input */}
      <Flex align="center" gap="2">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          size="sm"
          flex="1"
          borderRadius="xl"
          _placeholder={{ opacity: 0.5, color: 'gray.400' }}
        />

        <Tooltip label="Send Message" placement="top" hasArrow>
          <IconButton size="sm" icon={<MdSend />} aria-label="Send Message " onClick={handleSendMessage} colorScheme="teal" />
        </Tooltip>
        {isOwner && (
          <Tooltip label="Clear Chat" placement="top" hasArrow>
            <IconButton size="sm" icon={<MdDelete />} aria-label="Clear Chats" onClick={handleClearChat} colorScheme="red" />
          </Tooltip>
        )}
      </Flex>
    </>
  );
}

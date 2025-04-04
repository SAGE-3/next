/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import {
  Button,
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
} from '@chakra-ui/react';
import { FaCrown } from 'react-icons/fa';

// SAGE3 Imports
import { useHexColor, useRouteNav, useUser, useUsersStore } from '@sage3/frontend';

// Party Imports
import { usePartyStore } from './PartyStore';

export function PartyInstance(): JSX.Element {
  const { leaveParty, partyMembers, currentParty, disbandParty, chats, addChat, clearChat, setPartyBoard } = usePartyStore();
  const { users } = useUsersStore();
  const { user } = useUser();

  const { toBoard } = useRouteNav();

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

  const handleSetBoard = () => {
    if (currentParty?.board) {
      setPartyBoard();
      return;
    }
    if (boardId && roomId) {
      setPartyBoard(boardId, roomId);
    }
  };

  const present = () => {
    console.log('Present');
  };

  const handleClearChat = () => {
    console.log('Clear chat');
    clearChat(currentParty);
  };

  const handleGoToBoard = () => {
    if (currentParty?.board) {
      toBoard(currentParty.board.roomId, currentParty.board.boardId);
    }
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
            {isOwner && (
              <Button size="sm" onClick={handleSetBoard}>
                {currentParty?.board ? 'Unset Board' : 'Set Board'}
              </Button>
            )}
            {!isOwner && (
              <Button size="sm" onClick={handleGoToBoard} isDisabled={!currentParty?.board}>
                Go To Board
              </Button>
            )}
            {isOwner && (
              <Button size="sm" onClick={handleClearChat}>
                Clear Chat
              </Button>
            )}
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

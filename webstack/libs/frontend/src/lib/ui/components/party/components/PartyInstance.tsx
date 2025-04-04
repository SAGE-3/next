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
} from '@chakra-ui/react';
import { FaCrown } from 'react-icons/fa';
import { ImExit } from 'react-icons/im';

// SAGE3 Imports
import { useHexColor, useRouteNav, useUser, useUsersStore } from '@sage3/frontend';

// Party Imports
import { usePartyStore } from './PartyStore';
import { MdDelete, MdExitToApp, MdPresentToAll, MdSend } from 'react-icons/md';

export function PartyInstance(): JSX.Element {
  // Store imports
  const { leaveParty, partyMembers, currentParty, disbandParty, chats, setPartyBoard } = usePartyStore();
  const { user } = useUser();

  // Route imports
  const { boardId, roomId } = useParams();
  const { toBoard } = useRouteNav();

  // Is this user the owner of the party?
  const isOwner = currentParty?.ownerId === user?._id;
  const partySize = partyMembers.filter((member) => member.party === currentParty?.ownerId).length;
  const chatSize = chats.length;

  // Use Effect to set the current board of the party. Based of the owner
  useEffect(() => {
    if (isOwner) {
      if (boardId && roomId) {
        setPartyBoard(boardId, roomId);
      } else {
        setPartyBoard();
      }
    }
  }, [boardId, roomId, setPartyBoard, isOwner]);

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

  const handlePresent = () => {
    console.log('Present');
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
          <Tab>Members ({partySize})</Tab>
          <Tab>Chat ({chatSize})</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <PartyMembersList members={members} />
          </TabPanel>
          <TabPanel height="100%">
            <PartyChats />
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Flex flexDir="column" mt="auto" width="100%">
        <Divider my="2" />
        <HStack justify="space-between">
          <HStack>
            <Tooltip label="Present to Party" placement="top" hasArrow>
              <IconButton size="sm" icon={<MdPresentToAll />} aria-label="Create Party" onClick={handlePresent} colorScheme="teal" />
            </Tooltip>
            {!isOwner && (
              <Tooltip label="Go to Board" placement="top" hasArrow>
                <IconButton
                  size="sm"
                  icon={<MdExitToApp />}
                  aria-label="Go to Board"
                  onClick={handleGoToBoard}
                  colorScheme="teal"
                  isDisabled={!currentParty?.board}
                />
              </Tooltip>
            )}
          </HStack>
          <HStack>
            {isOwner ? (
              <Tooltip label="Disband Party" placement="top" hasArrow>
                <IconButton size="sm" icon={<ImExit />} aria-label="Clear Chats" onClick={disbandParty} colorScheme="red" />
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
      {props.members.map((member) => {
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
      <Flex align="center" gap="2">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          size="sm"
          flex="1"
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

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Box, useColorModeValue, Text, Image, Progress, Button, IconButton, Input } from '@chakra-ui/react';

import {
  JoinBoardCheck,
  RoomList,
  useBoardStore,
  usePresenceStore,
  useRoomStore,
  useUsersStore,
  MainButton,
  useUser,
  Clock,
  usePluginStore,
  useConfigStore,
  useRouteNav,
  useHexColor,
} from '@sage3/frontend';
import { Board, Room, User } from '@sage3/shared/types';
import { MdAdd, MdExitToApp, MdLock, MdPerson } from 'react-icons/md';

export function HomePage() {
  // URL Params
  const { roomId } = useParams();
  const { toHome } = useRouteNav();

  // Configuration information
  const config = useConfigStore((state) => state.config);

  // Room Store
  const [selectedRoomId] = useState<string | undefined>(roomId);
  const rooms = useRoomStore((state) => state.rooms);
  const subToRooms = useRoomStore((state) => state.subscribeToAllRooms);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const roomsFetched = useRoomStore((state) => state.fetched);

  // Board Store
  const { boards, subscribeByRoomId } = useBoardStore((state) => state);
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(undefined);

  // Plugins
  const subPlugins = usePluginStore((state) => state.subscribeToPlugins);

  // Users and presence
  const { user } = useUser();
  const users = useUsersStore((state) => state.users);
  const updatePresence = usePresenceStore((state) => state.update);
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);
  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);

  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // UI Colors
  const roomListBackgroud = useColorModeValue('gray.300', 'gray.700');
  const roomListBG = useHexColor(roomListBackgroud);
  const boardListBackground = useColorModeValue('gray.200', 'gray.800');
  const boardListBG = useHexColor(boardListBackground);
  const infoBackground = useColorModeValue('gray.100', 'gray.900');
  const infoBG = useHexColor(infoBackground);
  const borderColor = useHexColor(selectedRoom ? selectedRoom.data.color : 'gray.300');

  // Subscribe to user updates
  useEffect(() => {
    // Update the document title
    document.title = 'SAGE3 - Rooms and Boards';

    subscribeToPresence();
    subscribeToUsers();
    subToRooms();
    subPlugins();
  }, []);

  function handleRoomClick(room: Room | undefined) {
    if (room) {
      setSelectedRoom(room);
      setSelectedBoard(undefined);
      if (user) updatePresence(user._id, { roomId: room._id, boardId: '', following: '' });
      // update the URL, helps with history
      toHome(room._id);
    } else {
      setSelectedRoom(undefined);
      setSelectedBoard(undefined);
      if (user) updatePresence(user._id, { roomId: '', boardId: '', following: '' });
    }
  }

  function handleBoardClick(board: Board) {
    setSelectedBoard(board);
  }

  useEffect(() => {
    const room = rooms.find((r) => r._id === selectedRoom?._id);
    if (!room) {
      setSelectedRoom(undefined);
      setSelectedBoard(undefined);
    } else {
      setSelectedRoom(room);
    }
    if (!boards.find((board) => board._id === selectedBoard?._id)) {
      setSelectedBoard(undefined);
    }
  }, [JSON.stringify(rooms), JSON.stringify(boards)]);

  // To handle the case where the user is redirected to the home page from a board
  useEffect(() => {
    function goToMainRoom() {
      // Go to Main Room, should be the oldest room on the server.
      const room = rooms.reduce((prev, curr) => (prev._createdAt < curr._createdAt ? prev : curr));
      handleRoomClick(room);
    }
    if (roomsFetched) {
      if (!selectedRoomId) {
        goToMainRoom();
      } else {
        // Go to room with id. Does room exist, if not go to main room
        const room = rooms.find((room) => room._id === selectedRoomId);
        room ? handleRoomClick(room) : goToMainRoom();
      }
    }
  }, [roomsFetched]);

  useEffect(() => {
    if (selectedRoom) {
      subscribeByRoomId(selectedRoom?._id);
    }
  }, [selectedRoom]);

  return (
    // Main Container
    <Box display="flex" flexDir={'column'} width="100%" height="100%" alignItems="center" justifyContent="space-between">
      {/* Check if the user wanted to join a board through a URL */}
      <JoinBoardCheck />
      {/* Top Bar */}
      <Box display="flex" flexDirection="row" justifyContent="space-between" height={'32px'} width="100vw" px="2">
        <Box flex="1 1 0px">
          <Text
            fontSize="xl"
            flex="1 1 0px"
            textOverflow={'ellipsis'}
            overflow={'hidden'}
            justifyContent="left"
            display="flex"
            width="100%"
            userSelect="none"
            whiteSpace={'nowrap'}
          >
            Server: {config?.serverName}
          </Text>
        </Box>
        <Box></Box>

        <Box flex="1 1 0px" justifyContent="right" display="flex" alignItems={'start'}>
          <Clock />
        </Box>
      </Box>

      {/* Middle Section */}

      <Box
        display="flex"
        flexDirection="row"
        flexGrow={1}
        justifyContent={'center'}
        minHeight={0}
        width="100%"
        height="100%"
        overflow="hidden"
      >
        {roomsFetched ? (
          <>
            <Box display="column" height="100%" pt="8px" width="400px" background={boardListBG} borderRight={`solid 1px white`}>
              <Box px="2" mb="2" display="flex" justifyContent={'space-between'}>
                <h3>Rooms</h3>
                <IconButton
                  size="sm"
                  colorScheme="teal"
                  variant={'outline'}
                  aria-label="enter-board"
                  fontSize="xl"
                  icon={<MdAdd />}
                ></IconButton>
              </Box>

              {rooms
                .sort((a, b) => a.data.name.localeCompare(b.data.name))
                .map((room) => {
                  return <RoomCard room={room} selected={selectedRoom?._id === room._id} onClick={handleRoomClick} />;
                })}
            </Box>
            <Box
              display="column"
              height="100%"
              width="400px"
              p="8px"
              background={roomListBG}
              borderTop={`solid 1px white`}
              borderBottom={`solid 1px white`}
            >
              <Box display="flex" justifyContent={'space-between'}>
                <h3>{selectedRoom?.data.name}</h3>
                <IconButton size="sm" variant={'outline'} aria-label="enter-board" fontSize="xl" icon={<MdLock />}></IconButton>{' '}
              </Box>
              <Box height="300px" display="flex" my="4" flexDir="column" justifyContent={'space-between'}>
                <Box>
                  <Text fontSize="sm">This is the board's description.</Text>
                  <Text fontSize="sm">Owner: Ryan Theriot</Text>
                  <Text fontSize="sm">Created: Jan 5th, 2023</Text>
                  <Text fontSize="sm">Updated: Oct 5th, 2023</Text>
                </Box>
                <Box>
                  <Button size="sm" width="100%" my="1" colorScheme="teal" variant="outline">
                    Edit
                  </Button>
                  <Button size="sm" width="100%" my="1" colorScheme="teal" variant="outline">
                    Manage Members
                  </Button>
                </Box>
              </Box>
              <h3>Room Members</h3>
              {users.map((user) => {
                return <UserCard user={user} onClick={() => {}} />;
              })}
            </Box>
            <Box
              display="column"
              height="100%"
              width="600px"
              p="8px"
              background={boardListBG}
              borderTop={`solid 1px white`}
              borderBottom={`solid 1px white`}
            >
              <Box px="2" display="flex" justifyContent={'space-between'}>
                <h3>Boards</h3>
                <IconButton size="sm" variant={'outline'} aria-label="enter-board" fontSize="xl" icon={<MdAdd />}></IconButton>{' '}
              </Box>
              {boards
                .sort((a, b) => a.data.name.localeCompare(b.data.name))
                .map((board) => {
                  return <BoardCard board={board} onClick={() => {}} />;
                })}
            </Box>

            <Box
              display="column"
              height="100%"
              width="100%"
              background={infoBG}
              borderTop={`solid 1px white`}
              borderBottom={`solid 1px white`}
            ></Box>
          </>
        ) : (
          <Box display="flex" flexDirection="column" justifyContent={'center'} alignItems="center" height="100%" width="100%">
            <Progress isIndeterminate width="100%" borderRadius="md" />
          </Box>
        )}
      </Box>
      {/* {roomsFetched ? (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent={'center'}
            alignItems="flex-start"
            height="100%"
            width="100%"
            maxWidth="1200"
          >
            <RoomList
              selectedRoom={selectedRoom}
              onRoomClick={handleRoomClick}
              rooms={rooms}
              boards={boards}
              onBackClick={() => handleRoomClick(undefined)}
              onBoardClick={handleBoardClick}
            ></RoomList>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" justifyContent={'center'} alignItems="center" height="100%" width="100%">
            <Progress isIndeterminate width="100%" borderRadius="md" />
          </Box>
        )}
      </Box> */}

      {/* Bottom Bar */}
      <Box
        display="flex"
        flexDirection="row"
        justifyContent={'space-between'}
        width="100%"
        minHeight={'initial'}
        alignItems="center"
        py="2"
        px="2"
      >
        <Box display={'flex'}>
          <MainButton buttonStyle="solid" config={config} />
          <Box width="400px" px="8px" py="8px" display="flex">
            <Text fontSize="sm" mr="2">
              {' '}
              Search
            </Text>
            <Input size="xs"></Input>
          </Box>
        </Box>
        <Image src={imageUrl} height="30px" style={{ opacity: 0.7 }} alt="sag3" userSelect={'auto'} draggable={false} />
      </Box>
    </Box>
  );
}

function RoomCard(props: { room: Room; selected: boolean; onClick: (room: Room) => void }) {
  const borderColorValue = useColorModeValue(props.room.data.color, props.room.data.color);
  const borderColor = useHexColor(borderColorValue);
  const borderColorGray = useColorModeValue('gray.300', 'gray.700');
  const borderColorG = useHexColor(borderColorGray);

  return (
    <Box
      // my="4"
      p="2"
      pl="4"
      display="flex"
      onClick={() => props.onClick(props.room)}
      border={`solid 1px ${props.selected ? 'white' : 'none'}`}
      // borderRadius="md"
      borderRight="none"
      borderLeft="none"
      boxSizing="border-box"
      backgroundColor={props.selected ? borderColorG : 'transparent'}
      _hover={{ cursor: 'pointer', backgroundColor: borderColorG }}
      width={props.selected ? 'calc(100% + 2px)' : '100%'}
    >
      <Text fontSize="md" fontWeight="bold" textAlign="center">
        {props.room.data.name}
      </Text>
    </Box>
  );
}

function BoardCard(props: { board: Board; onClick: (board: Board) => void }) {
  const borderColorValue = useColorModeValue(props.board.data.color, props.board.data.color);
  const borderColor = useHexColor(borderColorValue);
  const borderColorGray = useColorModeValue('gray.300', 'gray.700');
  const borderColorG = useHexColor(borderColorGray);
  return (
    <Box
      my="1"
      p="1"
      px="2"
      display="flex"
      borderRadius="md"
      justifyContent={'space-between'}
      alignContent={'center'}
      onClick={() => props.onClick(props.board)}
      background="gray.800"
      _hover={{ cursor: 'pointer', backgroundColor: borderColorG }}
    >
      <Text fontSize="md" textAlign="center" lineHeight="32px" fontWeight="bold">
        {props.board.data.name}
      </Text>
      <IconButton size="sm" variant={'ghost'} aria-label="enter-board" fontSize="xl" icon={<MdExitToApp />}></IconButton>
    </Box>
  );
}

function UserCard(props: { user: User; onClick: (user: User) => void }) {
  const borderColorValue = useColorModeValue(props.user.data.color, props.user.data.color);
  const borderColor = useHexColor(borderColorValue);
  const borderColorGray = useColorModeValue('gray.300', 'gray.600');
  const borderColorG = useHexColor(borderColorGray);

  const offline = useHexColor('red');
  const online = useHexColor('green');
  return (
    <Box
      my="2"
      p="2"
      display="flex"
      justifyContent={'left'}
      alignContent={'center'}
      onClick={() => props.onClick(props.user)}
      borderRadius="md"
      _hover={{ cursor: 'pointer', background: borderColorG }}
    >
      <IconButton
        size="xs"
        variant={'ghost'}
        aria-label="enter-board"
        fontSize="2xl"
        mr="2"
        color={Math.random() > 0.5 ? offline : online}
        icon={<MdPerson />}
      ></IconButton>

      <Text fontSize="sm" fontWeight="bold" textAlign="center" lineHeight="24px">
        {props.user.data.name}
      </Text>
    </Box>
  );
}

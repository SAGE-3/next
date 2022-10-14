/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The fListl license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import {
  Box, useColorModeValue, Text, Image, Heading, Stack,
  UnorderedList, ListItem, Button
} from '@chakra-ui/react';

import {
  JoinBoardCheck,
  RoomList,
  serverConfiguration,
  useBoardStore,
  useData,
  useRoomStore,
  useAppStore,
  useUsersStore,
  useMessageStore,
  usePresenceStore,
  useAssetStore,
} from '@sage3/frontend';

import { HomeAvatar } from '../components/Home/HomeAvatar';
import { Clock } from '../components/Board/UI/Clock';
import { Link } from 'react-router-dom';

// Application specific schema
import { Board, BoardSchema, Asset, AssetSchema } from '@sage3/shared/types';

import { APIHttp } from '@sage3/frontend';
import { App, AppSchema } from '@sage3/applications/schema';

export function AdminPage() {
  const rooms = useRoomStore((state) => state.rooms);
  const users = useUsersStore((state) => state.users);
  const messages = useMessageStore((state) => state.messages);
  const presences = usePresenceStore((state) => state.presences);
  // Users and presence
  const subscribeToPresence = usePresenceStore((state) => state.subscribe);
  const subscribeToUsers = useUsersStore((state) => state.subscribeToUsers);
  const subToRooms = useRoomStore((state) => state.subscribeToAllRooms);

  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');
  const config = useData('/api/configuration') as serverConfiguration;

  // Collections
  const [boards, setBoards] = useState<Board[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  useEffect(() => {
    APIHttp.GET<BoardSchema, Board>('/boards').then((bb) => {
      if (bb.success && bb.data) setBoards(bb.data);
    });
    APIHttp.GET<AppSchema, App>('/apps').then((bb) => {
      if (bb.success && bb.data) setApps(bb.data);
    });
    APIHttp.GET<AssetSchema, Asset>('/assets').then((bb) => {
      if (bb.success && bb.data) setAssets(bb.data);
    });
  }, []);

  // Subscribe to user updates
  useEffect(() => {
    subscribeToPresence();
    subscribeToUsers();
    subToRooms();
  }, []);



  const delAsset = (id: string) => {
    console.log('delete asset', id);
  };

  const delApp = (id: string) => {
    APIHttp.DELETE('/apps/' + id).then((resp) => {
      console.log('delete app', id, resp);
    });
  };
  const delRoom = (id: string) => {
    APIHttp.DELETE('/rooms/' + id).then((resp) => {
      console.log('delete room', id, resp);
    });
  };
  const delBoard = (id: string) => {
    APIHttp.DELETE('/boards/' + id).then((resp) => {
      console.log('delete board', id, resp);
    });
  };
  const delUser = (id: string) => {
    APIHttp.DELETE('/users/' + id).then((resp) => {
      console.log('delete user', id, resp);
    });
  };

  return (
    // Main Container
    <Box display="flex" flexDir={'column'} width="100%" height="100%" alignItems="center" justifyContent="space-between">
      {/* Check if the user wanted to join a board through a URL */}
      <JoinBoardCheck />
      {/* Top Bar */}
      <Box display="flex" flexDirection="row" justifyContent="space-between" minHeight={45} width="100%" px="2">
        <Box flex="1 1 0px"></Box>
        <Text fontSize="4xl" flex="1 1 0px" justifyContent="center" display="flex">
          SAGE3: {config?.serverName}
        </Text>
        <Box flex="1 1 0px" justifyContent="right" display="flex" alignItems={'start'}>
          <Clock />
        </Box>
      </Box>


      {/* Middle Section */}

      <Box
        justifyContent={'left'}
        minHeight={0}
        width="100%"
        maxWidth="1200px"
        minWidth="400px"
        px="4"
        overflowY={'scroll'}
      >
        <Stack spacing={4}>

          <Heading color={"lightblue"}><Link to="/#/home">Home</Link></Heading>

          <Heading>Rooms</Heading>
          <UnorderedList pl={10}>
            {rooms.map((room) => {
              return (
                <ListItem key={room._id}>{room._id}: {room.data.name} ({room.data.description})
                  <Button mx={3} colorScheme='red' size='xs' onClick={() => delRoom(room._id)}>del</Button>
                </ListItem>
              );
            })}
          </UnorderedList>

          <Heading>Boards</Heading>
          <UnorderedList pl={10}>
            {boards.map((board) => {
              return (
                <ListItem key={board._id}>{board._id}: {board.data.name} ({board.data.description})
                  <Button mx={3} colorScheme='red' size='xs' onClick={() => delBoard(board._id)}>del</Button>
                </ListItem>
              );
            })}
          </UnorderedList>

          <Heading>Apps</Heading>
          <UnorderedList pl={10}>
            {apps.map((app) => {
              return (
                <ListItem key={app._id}>{app._id}: {app.data.name}
                  <Button mx={3} colorScheme='red' size='xs' onClick={() => delApp(app._id)}>del</Button>
                </ListItem>
              );
            })}
          </UnorderedList>

          <Heading>Assets</Heading>
          <UnorderedList pl={10}>
            {assets.map((a) => {
              return (
                <ListItem key={a._id}>{a._id}: {a.data.originalfilename}
                  <Button mx={3} colorScheme='red' size='xs' onClick={() => delAsset(a._id)}>del</Button>
                </ListItem>
              );
            })}
          </UnorderedList>

          <Heading>Users</Heading>
          <UnorderedList pl={10}>
            {users.map((user) => {
              return (
                <ListItem key={user._id}>{user._id}: {user.data.name}
                  <Button mx={3} colorScheme='red' size='xs' onClick={() => delUser(user._id)}>del</Button>
                  <UnorderedList pl={10}>
                    <ListItem>email: {user.data.email}</ListItem>
                    <ListItem>role: {user.data.userRole} - type: {user.data.userType}</ListItem>
                  </UnorderedList>
                </ListItem>
              );
            })}
          </UnorderedList>

          <Heading>Presences</Heading>
          <UnorderedList pl={10}>
            {presences.map((p) => {
              return (
                <ListItem key={p._id}>{p.data.userId}
                  <UnorderedList pl={10}>
                    <ListItem>room: {p.data.roomId} - board: {p.data.boardId} </ListItem>
                    {/* <ListItem>cursor: {p.data.cursor.x} {p.data.cursor.y}</ListItem>
                    <ListItem>status: {p.data.status}</ListItem>
                    <ListItem>viewport: p {p.data.viewport.position.x} x {p.data.viewport.position.y} - s {p.data.viewport.size.width} x {p.data.viewport.size.height}</ListItem> */}
                  </UnorderedList>
                </ListItem>
              );
            })}
          </UnorderedList>

          <Heading>Messages</Heading>
          <UnorderedList pl={10}>
            {messages.map((message) => {
              return (
                <ListItem key={message._id}>{message.data.type}: {message.data.payload} </ListItem>
              );
            })}
          </UnorderedList>

        </Stack>
      </Box>

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
        <HomeAvatar />
        <Box></Box>
        <Image src={imageUrl} height="30px" style={{ opacity: 0.7 }} alt="" />
      </Box>
    </Box >
  );
}

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, useColorModeValue, Text, Image, Heading, Button, Tab, TabList, TabPanel, TabPanels, Tabs, useToast } from '@chakra-ui/react';

import { JoinBoardCheck, serverConfiguration, useData, MainButton } from '@sage3/frontend';

import { Clock } from '../board/components/Board/ui/Clock';
import { Link } from 'react-router-dom';

import './adminStyle.css';

// Application specific schema
import {
  Board,
  BoardSchema,
  Asset,
  AssetSchema,
  User,
  Room,
  UserSchema,
  RoomSchema,
  Message,
  Presence,
  MessageSchema,
  PresenceSchema,
} from '@sage3/shared/types';

import { APIHttp } from '@sage3/frontend';
import { App, AppSchema } from '@sage3/applications/schema';

export function AdminPage() {
  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');
  const config = useData('/api/configuration') as serverConfiguration;

  // Collections
  const [boards, setBoards] = useState<Board[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [presences, setPresences] = useState<Presence[]>([]);

  const fetchApps = () => {
    APIHttp.GET<AppSchema, App>('/apps').then((bb) => {
      if (bb.success && bb.data) setApps(bb.data);
    });
  };

  const fetchBoards = () => {
    APIHttp.GET<BoardSchema, Board>('/boards').then((bb) => {
      if (bb.success && bb.data) setBoards(bb.data);
    });
  };
  const fetchAssets = () => {
    APIHttp.GET<AssetSchema, Asset>('/assets').then((bb) => {
      if (bb.success && bb.data) setAssets(bb.data);
    });
  };
  const fetchUsers = () => {
    APIHttp.GET<UserSchema, User>('/users').then((bb) => {
      if (bb.success && bb.data) setUsers(bb.data);
    });
  };
  const fetchRooms = () => {
    APIHttp.GET<RoomSchema, Room>('/rooms').then((bb) => {
      if (bb.success && bb.data) setRooms(bb.data);
    });
  };

  const fetchMessages = () => {
    APIHttp.GET<MessageSchema, Message>('/message').then((bb) => {
      if (bb.success && bb.data) setMessages(bb.data);
    });
  };
  const fetchPresences = () => {
    APIHttp.GET<PresenceSchema, Presence>('/presence').then((bb) => {
      if (bb.success && bb.data) setPresences(bb.data);
    });
  };

  const fetchAll = () => {
    fetchApps();
    fetchBoards();
    fetchAssets();
    fetchUsers();
    fetchRooms();
    fetchMessages();
    fetchPresences();
  };

  const toast = useToast();

  useEffect(() => {
    fetchAll();
  }, []);

  const delAsset = (id: string) => {
    APIHttp.DELETE('/assets/' + id).then((resp) => {
      if (resp.success) {
        toast({ title: 'Asset Deleted', status: 'info', duration: 2000, isClosable: true });
        fetchAssets();
      }
    });
  };

  const delApp = (id: string) => {
    APIHttp.DELETE('/apps/' + id).then((resp) => {
      if (resp.success) {
        toast({ title: 'App Deleted', status: 'info', duration: 2000, isClosable: true });
        fetchApps();
      }
    });
  };
  const delRoom = (id: string) => {
    APIHttp.DELETE('/rooms/' + id).then((resp) => {
      if (resp.success) {
        toast({ title: 'Room Deleted', status: 'info', duration: 2000, isClosable: true });
        fetchRooms();
      }
    });
  };
  const delBoard = (id: string) => {
    APIHttp.DELETE('/boards/' + id).then((resp) => {
      if (resp.success) {
        toast({ title: 'Board Deleted', status: 'info', duration: 2000, isClosable: true });
        fetchBoards();
      }
    });
  };
  const delUser = (id: string) => {
    APIHttp.DELETE('/users/' + id).then((resp) => {
      if (resp.success) {
        toast({ title: 'User Deleted', status: 'info', duration: 2000, isClosable: true });
        fetchUsers();
      }
    });
  };

  const delMessage = (id: string) => {
    APIHttp.DELETE('/message/' + id).then((resp) => {
      if (resp.success) {
        toast({ title: 'Message Deleted', status: 'info', duration: 2000, isClosable: true });
        fetchMessages();
      }
    });
  };
  const delPresence = (id: string) => {
    APIHttp.DELETE('/presence/' + id).then((resp) => {
      if (resp.success) {
        toast({ title: 'Presence Deleted', status: 'info', duration: 2000, isClosable: true });
        fetchPresences();
      }
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
        display="flex"
        flexDir="column"
        height="100%"
        minHeight={0}
        width="100%"
        maxWidth="1600px"
        minWidth="400px"
        px="4"
        overflowY={'scroll'}
      >
        <Heading color={'lightblue'}>
          <Box display="flex" justifyContent="space-between">
            <Link to="/#/home">Home</Link>
            <></>
            <Button onClick={fetchAll}>Refresh</Button>
          </Box>
        </Heading>

        <Tabs width="100%">
          <TabList>
            <Tab>Rooms</Tab>
            <Tab>Boards</Tab>
            <Tab>Apps</Tab>
            <Tab>Assets</Tab>
            <Tab>Users</Tab>
            <Tab>Presences</Tab>
            <Tab>Messages</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Heading>Rooms</Heading>
              <table>
                <thead>
                  <tr>
                    <th>id</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => {
                    return (
                      <tr key={room._id}>
                        <td>{room._id}</td>
                        <td>{room.data.name}</td>
                        <td> {room.data.description}</td>
                        <td>
                          <Button mx={3} colorScheme="red" size="xs" onClick={() => delRoom(room._id)}>
                            del
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TabPanel>
            <TabPanel>
              <Heading>Boards</Heading>

              <table>
                <tr>
                  <th>id</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>

                {boards.map((board) => {
                  return (
                    <tr key={board._id}>
                      <td>{board._id}</td>
                      <td>{board.data.name}</td>
                      <td> {board.data.description}</td>
                      <td>
                        <Button mx={3} colorScheme="red" size="xs" onClick={() => delBoard(board._id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </table>
            </TabPanel>
            <TabPanel>
              <Heading>Apps</Heading>

              <table>
                <tr>
                  <th>id</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>

                {apps.map((app) => {
                  return (
                    <tr key={app._id}>
                      <td>{app._id}</td>
                      <td>{app.data.title}</td>
                      <td>{app.data.type}</td>
                      <td>
                        <Button mx={3} colorScheme="red" size="xs" onClick={() => delApp(app._id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </table>
            </TabPanel>
            <TabPanel>
              <Heading>Assets</Heading>

              <table>
                <tr>
                  <th>id</th>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>

                {assets.map((asset) => {
                  return (
                    <tr key={asset._id}>
                      <td>{asset._id}</td>
                      <td>{asset.data.originalfilename}</td>
                      <td>
                        <Button mx={3} colorScheme="red" size="xs" onClick={() => delAsset(asset._id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </table>
            </TabPanel>
            <TabPanel>
              <Heading>Users</Heading>

              <table>
                <tr>
                  <th>id</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>

                {users.map((user) => {
                  return (
                    <tr key={user._id}>
                      <td>{user._id}</td>
                      <td>{user.data.name}</td>
                      <td>{user.data.email}</td>
                      <td>{user.data.userRole}</td>
                      <td>{user.data.userType}</td>
                      <td>
                        <Button mx={3} colorScheme="red" size="xs" onClick={() => delUser(user._id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </table>
            </TabPanel>

            <TabPanel>
              <Heading>Presences</Heading>

              <table>
                <tr>
                  <th>id</th>
                  <th>RoomId</th>
                  <th>BoardId</th>
                  <th>Actions</th>
                </tr>

                {presences.map((p) => {
                  return (
                    <tr key={p._id}>
                      <td>{p._id}</td>
                      <td>{p.data.roomId}</td>
                      <td>{p.data.boardId}</td>
                      <td>
                        <Button mx={3} colorScheme="red" size="xs" onClick={() => delPresence(p._id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </table>
            </TabPanel>
            <TabPanel>
              <Heading>Messages</Heading>

              <table>
                <tr>
                  <th>id</th>
                  <th>Type</th>
                  <th>Payload</th>
                  <th>Actions</th>
                </tr>

                {messages.map((message) => {
                  return (
                    <tr key={message._id}>
                      <td>{message._id}</td>
                      <td>{message.data.type}</td>
                      <td>{message.data.payload}</td>
                      <td>
                        <Button mx={3} colorScheme="red" size="xs" onClick={() => delMessage(message._id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </table>
            </TabPanel>
          </TabPanels>
        </Tabs>
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
        <MainButton buttonStyle="solid" />
        <Image src={imageUrl} height="30px" style={{ opacity: 0.7 }} alt="sage3" userSelect={'auto'} draggable={false} />
      </Box>
    </Box>
  );
}

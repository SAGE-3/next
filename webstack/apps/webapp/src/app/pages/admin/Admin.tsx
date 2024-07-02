/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Code, Box, useColorModeValue, Text, Image, Heading, Button, Tab, TabList, TabPanel, TabPanels, Tabs, useToast } from '@chakra-ui/react';

// Collection specific schemas
import { App } from '@sage3/applications/schema';
import { JoinBoardCheck, useConfigStore, MainButton, Clock, APIHttp } from '@sage3/frontend';
import { Board, Asset, User, Room, Message, Presence, Insight } from '@sage3/shared/types';

// Styles
import './adminStyle.css';

export function AdminPage() {
  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // Configuration information
  const config = useConfigStore((state) => state.config);

  // Collections
  const [boards, setBoards] = useState<Board[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

  // Pre element for displaying messages
  const preRef = useRef<HTMLPreElement>(null);

  const fetchApps = () => {
    APIHttp.GET<App>('/apps').then((bb) => {
      if (bb.success && bb.data) setApps(bb.data);
    });
  };
  const fetchBoards = () => {
    APIHttp.GET<Board>('/boards').then((bb) => {
      if (bb.success && bb.data) setBoards(bb.data);
    });
  };
  const fetchAssets = () => {
    APIHttp.GET<Asset>('/assets').then((bb) => {
      if (bb.success && bb.data) setAssets(bb.data);
    });
  };
  const fetchUsers = () => {
    APIHttp.GET<User>('/users').then((bb) => {
      if (bb.success && bb.data) setUsers(bb.data);
    });
  };
  const fetchRooms = () => {
    APIHttp.GET<Room>('/rooms').then((bb) => {
      if (bb.success && bb.data) setRooms(bb.data);
    });
  };
  const fetchMessages = () => {
    APIHttp.GET<Message>('/message').then((bb) => {
      if (bb.success && bb.data) setMessages(bb.data);
    });
  };
  const fetchPresences = () => {
    APIHttp.GET<Presence>('/presence').then((bb) => {
      if (bb.success && bb.data) setPresences(bb.data);
    });
  };
  const fetchInsights = () => {
    APIHttp.GET<Insight>('/insight').then((bb) => {
      if (bb.success && bb.data) setInsights(bb.data);
    });
  };

  // Get all collections
  const fetchAll = () => {
    fetchApps();
    fetchBoards();
    fetchAssets();
    fetchUsers();
    fetchRooms();
    fetchMessages();
    fetchPresences();
    fetchInsights();
  };

  const toast = useToast();

  // Add log messages to the output log
  const processLogMessage = (ev: MessageEvent<any>) => {
    const data = JSON.parse(ev.data);
    if (data.type === 'log') {
      const entries = data.data as any[];
      entries.forEach((entry) => {
        if (preRef.current) {
          preRef.current.innerHTML += `<b>${entry.tag}</b> ${JSON.stringify(entry.doc.data, null, 0)}<br>`;
          preRef.current.scrollTop = preRef.current.scrollHeight;
        }
      });
    }
  };

  // Clear the ouput log
  const delLogs = () => {
    if (preRef.current) {
      preRef.current.innerHTML = "";
      preRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    // Update the document title
    document.title = 'SAGE3 - Admin';

    fetchAll();

    // Open websocket connection to the server
    const socketType = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${socketType}//${window.location.host}/logs`;
    const sock = new WebSocket(socketUrl);
    waitForOpenSocket(sock).then(() => {
      sock.addEventListener('message', processLogMessage);
      sock.addEventListener('close', () => {
        if (sock) sock.removeEventListener('message', processLogMessage);
      });
      sock.addEventListener('error', (ev) => {
        if (sock) sock.removeEventListener('message', processLogMessage);
      });
    });
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
  const delInsight = (id: string) => {
    APIHttp.DELETE('/insight/' + id).then((resp) => {
      if (resp.success) {
        toast({ title: 'Insight Deleted', status: 'info', duration: 2000, isClosable: true });
        fetchInsights();
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
            <Tab>Insight</Tab>
            <Tab>Messages</Tab>
            <Tab>Logs</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Heading>Rooms ({rooms.length})</Heading>
              <table className='adminTable'>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>id</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room, i) => {
                    return (
                      <tr key={room._id}>
                        <td>{i}</td>
                        <td>{room._id}</td>
                        <td>{room.data.name}</td>
                        <td> {room.data.description}</td>
                        <td>
                          <Button mx={3} colorScheme="red" size="xs" onClick={() => delRoom(room._id)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TabPanel>
            <TabPanel>
              <Heading>Boards ({boards.length})</Heading>

              <table className='adminTable'>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>id</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {boards.map((board, i) => {
                    return (
                      <tr key={board._id}>
                        <td>{i}</td>
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
                </tbody>
              </table>
            </TabPanel>
            <TabPanel>
              <Heading>Apps ({apps.length})</Heading>

              <table className='adminTable'>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>id</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app, i) => {
                    return (
                      <tr key={app._id}>
                        <td>{i}</td>
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
                </tbody>
              </table>
            </TabPanel>

            <TabPanel>
              <Heading>Assets ({assets.length})</Heading>

              <table className='adminTable'>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>id</th>
                    <th>Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset, i) => {
                    return (
                      <tr key={asset._id}>
                        <td>{i}</td>
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
                </tbody>
              </table>
            </TabPanel>

            <TabPanel>
              <Heading>Users ({users.length})</Heading>

              <table className='adminTable'>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>id</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => {
                    return (
                      <tr key={user._id}>
                        <td>{i}</td>
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
                </tbody>
              </table>
            </TabPanel>

            <TabPanel>
              <Heading>Presences ({presences.length})</Heading>

              <table className='adminTable'>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>id</th>
                    <th>RoomId</th>
                    <th>BoardId</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {presences.map((p, i) => {
                    return (
                      <tr key={p._id}>
                        <td>{i}</td>
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
                </tbody>
              </table>
            </TabPanel>

            <TabPanel>
              <Heading>Insights ({insights.length})</Heading>

              <table className='adminTable'>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>id</th>
                    <th>app_id</th>
                    <th>labels</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.map((p, i) => {
                    return (
                      <tr key={p._id}>
                        <td>{i}</td>
                        <td>{p._id}</td>
                        <td>{p.data.app_id}</td>
                        <td>{p.data.labels.join(', ')}</td>
                        <td>
                          <Button mx={3} colorScheme="red" size="xs" onClick={() => delInsight(p._id)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TabPanel>

            <TabPanel>
              <Heading>Messages ({messages.length})</Heading>
              <table className='adminTable'>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>id</th>
                    <th>Type</th>
                    <th>Payload</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message, i) => {
                    return (
                      <tr key={message._id}>
                        <td>{i}</td>
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
                </tbody>
              </table>
            </TabPanel>

            <TabPanel>
              <Heading>Logs</Heading>
              <Code ref={preRef} width={"100%"} height={"700px"} fontSize={"xs"} m={1} p={1} overflowY="scroll" overflowX="hidden"></Code>
              <Button mx={3} colorScheme="green" size="xs" onClick={() => delLogs()}>
                Clear Logs
              </Button>
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
        <MainButton buttonStyle="solid" config={config} />
        <Image src={imageUrl} height="30px" style={{ opacity: 0.7 }} alt="sage3" userSelect={'auto'} draggable={false} />
      </Box>
    </Box>
  );
}

/*
 * Wait for socket to be open
 *
 * @param {WebSocket} socket
 * @returns {Promise<void>}
 * */
async function waitForOpenSocket(socket: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (socket.readyState !== socket.OPEN) {
      socket.addEventListener('open', () => {
        resolve();
      });
    } else {
      resolve();
    }
  });
}

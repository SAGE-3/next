/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef } from 'react';
import {
  Code,
  Box,
  useColorModeValue,
  Image,
  Heading,
  Button,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useToast,
  useColorMode,
} from '@chakra-ui/react';

// Collection specific schemas
import { App, AppSchema } from '@sage3/applications/schema';
import { useConfigStore, APIHttp, useRouteNav } from '@sage3/frontend';
import {
  Board,
  Asset,
  User,
  Room,
  Message,
  Presence,
  Insight,
  SBDoc,
  RoomSchema,
  BoardSchema,
  AssetSchema,
  UserSchema,
  PresenceSchema,
  InsightSchema,
  MessageSchema,
} from '@sage3/shared/types';

// Styles
import './adminStyle.css';

// Components
import { TableViewer } from './components';

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

  // Home navigation
  const { toHome } = useRouteNav();
  const handleBackToHome = () => {
    toHome();
  };

  // Chakra Toggle Color Mode
  const { toggleColorMode, colorMode } = useColorMode();

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

  // Tab Index
  const [tabIndex, setTabIndex] = useState(0);
  const handleTabChange = (index: number) => {
    setTabIndex(index);
    if (index === 0) fetchRooms();
    if (index === 1) fetchBoards();
    if (index === 2) fetchApps();
    if (index === 3) fetchAssets();
    if (index === 4) fetchUsers();
    if (index === 5) fetchPresences();
    if (index === 6) fetchInsights();
    if (index === 7) fetchMessages();
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
      preRef.current.innerHTML = '';
      preRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    // Update the document title
    document.title = 'SAGE3 - Admin';

    fetchRooms();
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

  const deleteItem = (id: string, collection: string) => {
    APIHttp.DELETE(`/${collection}/` + id).then((resp) => {
      if (resp.success) {
        toast({ title: 'Item Deleted', status: 'info', duration: 2000, isClosable: true });
      }
    });
  };

  return (
    <Box display="flex" width="100vw" height="100vh" justifyContent="center" py="2" px="2">
      <Box height="100%" maxWidth="1600px" width="100%">
        {/* Top Section */}
        <Box display="flex" flexDir="column" justifyContent={'space-between'} height="calc(100vh - 18px)" minHeight={0} width="100%">
          <Box display="flex" justifyContent="left" gap="2">
            <Button onClick={handleBackToHome} colorScheme="teal" size="sm">
              Home
            </Button>
            <Button onClick={toggleColorMode} size="sm">
              {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
            </Button>
          </Box>

          {/* Tab Section that holds the main data and information */}
          <Tabs width="100%" onChange={(index) => handleTabChange(index)}>
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
                {TableViewer<RoomSchema>({
                  heading: 'Rooms',
                  data: rooms,
                  columns: ['_id', 'name', 'description', 'color'],
                  onRefresh: fetchRooms,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'rooms') }],
                })}
              </TabPanel>
              <TabPanel>
                {TableViewer<BoardSchema>({
                  heading: 'Boards',
                  data: boards,
                  columns: ['_id', 'name', 'description', 'isPrivate'],
                  onRefresh: fetchBoards,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'boards') }],
                })}
              </TabPanel>
              <TabPanel>
                {TableViewer<AppSchema>({
                  heading: 'Apps',
                  data: apps,
                  columns: ['_id', 'type', 'title', 'boardId'],
                  onRefresh: fetchApps,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'apps') }],
                })}
              </TabPanel>
              <TabPanel>
                {TableViewer<AssetSchema>({
                  heading: 'Assets',
                  data: assets,
                  columns: ['_id', 'originalfilename', 'mimetype', 'size'],
                  onRefresh: fetchAssets,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'assets') }],
                })}
              </TabPanel>

              <TabPanel>
                {TableViewer<UserSchema>({
                  heading: 'Users',
                  data: users,
                  columns: ['_id', 'email', 'name', 'color', 'userType', 'userRole'],
                  onRefresh: fetchUsers,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'users') }],
                })}
              </TabPanel>

              <TabPanel>
                {TableViewer<PresenceSchema>({
                  heading: 'Presences',
                  data: presences,
                  columns: ['_id', 'userId', 'roomId', 'boardId'],
                  onRefresh: fetchPresences,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'presence') }],
                })}
              </TabPanel>

              <TabPanel>
                {TableViewer<InsightSchema>({
                  heading: 'Insights',
                  data: insights,
                  columns: ['_id', 'app_id', 'boardId'],
                  onRefresh: fetchInsights,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'insight') }],
                })}
              </TabPanel>

              <TabPanel>
                {TableViewer<MessageSchema>({
                  heading: 'Messages',
                  data: messages,
                  columns: ['_id', 'type'],
                  onRefresh: fetchMessages,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'message') }],
                })}
              </TabPanel>

              <TabPanel>
                <Heading>Logs</Heading>
                <Code ref={preRef} width={'100%'} height={'700px'} fontSize={'xs'} m={1} p={1} overflowY="scroll" overflowX="hidden"></Code>
                <Button mx={3} colorScheme="green" size="xs" onClick={() => delLogs()}>
                  Clear Logs
                </Button>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Bottom Bar */}
          <Box display="flex" flexDirection="row" justifyContent={'space-between'} width="100%" minHeight={'initial'} alignItems="center">
            <div></div>
            <Image src={imageUrl} height="30px" style={{ opacity: 0.7 }} alt="sage3" userSelect={'auto'} draggable={false} />
          </Box>
        </Box>
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

/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
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
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';

// Collection specific schemas
import { App, AppSchema } from '@sage3/applications/schema';
import { APIHttp, useRouteNav } from '@sage3/frontend';
import {
  Board,
  Asset,
  User,
  Room,
  Message,
  Presence,
  Insight,
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
import { MdSearch } from 'react-icons/md';
import { throttle } from 'throttle-debounce';

export function AdminPage() {
  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

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

  const clearAllFetchedData = () => {
    setBoards([]);
    setApps([]);
    setAssets([]);
    setUsers([]);
    setRooms([]);
    setMessages([]);
    setPresences([]);
    setInsights([]);
  };

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
    setSearch('');
    setSearchValue('');
    clearAllFetchedData();
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

  const [search, setSearch] = useState('');
  const [searchValue, setSearchValue] = useState('');
  // Set Search Throttle
  const throttleSearchValue = throttle(250, (value: string) => {
    setSearchValue(value);
  });
  const throttleSearchValueRef = useCallback(throttleSearchValue, []);
  // Handle Search Change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    // Need to throttle this to increase performance
    throttleSearchValueRef(e.target.value);
  };

  return (
    <Flex direction="column" align="center" minH="100vh" py="2">
      <Flex direction="column" width="100%" maxW="1600px" flex="1">
        {/* Top Section */}
        <Box as="header">
          <Box display="flex" justifyContent="left" gap="2">
            <Button onClick={handleBackToHome} colorScheme="teal" size="sm">
              Home
            </Button>
            <Button onClick={toggleColorMode} size="sm">
              {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
            </Button>
          </Box>
        </Box>

        {/* Tab Section that holds the main data and information */}
        <Flex as="main" flex="1" overflow="hidden" my="3">
          <Tabs isFitted variant="enclosed" flex="1" onChange={handleTabChange}>
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
            {/* Search Input */}
            <InputGroup my="4" colorScheme="teal">
              <InputLeftElement pointerEvents="none">
                <MdSearch color="gray.300" />
              </InputLeftElement>
              <Input value={search} onChange={(e) => handleSearchChange(e)} placeholder="Search" width="500px" />
            </InputGroup>
            <TabPanels flex="1" overflow="hidden" height="100%">
              <TabPanel p={0} height="100%">
                {TableViewer<RoomSchema>({
                  heading: 'Rooms',
                  data: rooms,
                  search: searchValue,
                  columns: ['_id', 'name', 'description', 'color'],
                  onRefresh: fetchRooms,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'rooms') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<BoardSchema>({
                  heading: 'Boards',
                  data: boards,
                  search: searchValue,
                  columns: ['_id', 'name', 'description', 'isPrivate'],
                  onRefresh: fetchBoards,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'boards') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<AppSchema>({
                  heading: 'Apps',
                  data: apps,
                  search: searchValue,
                  columns: ['_id', 'type', 'title', 'boardId'],
                  onRefresh: fetchApps,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'apps') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<AssetSchema>({
                  heading: 'Assets',
                  data: assets,
                  search: searchValue,
                  columns: ['_id', 'originalfilename', 'mimetype', 'size'],
                  onRefresh: fetchAssets,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'assets') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<UserSchema>({
                  heading: 'Users',
                  data: users,
                  search: searchValue,
                  columns: ['_id', 'email', 'name', 'color', 'userType', 'userRole'],
                  onRefresh: fetchUsers,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'users') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<PresenceSchema>({
                  heading: 'Presences',
                  data: presences,
                  search: searchValue,
                  columns: ['_id', 'userId', 'roomId', 'boardId'],
                  onRefresh: fetchPresences,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'presence') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<InsightSchema>({
                  heading: 'Insights',
                  data: insights,
                  search: searchValue,
                  columns: ['_id', 'app_id', 'boardId'],
                  onRefresh: fetchInsights,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'insight') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<MessageSchema>({
                  heading: 'Messages',
                  data: messages,
                  search: searchValue,
                  columns: ['_id', 'type'],
                  onRefresh: fetchMessages,
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'message') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                <Heading>Logs</Heading>
                <Code ref={preRef} width={'100%'} height={'700px'} fontSize={'xs'} m={1} p={1} overflowY="scroll" overflowX="hidden"></Code>
                <Button mx={3} colorScheme="green" size="xs" onClick={() => delLogs()}>
                  Clear Logs
                </Button>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Flex>

        {/* Bottom Bar */}
        <Box as="footer">
          <div></div>
          <Image src={imageUrl} height="30px" style={{ opacity: 0.7 }} alt="sage3" userSelect={'auto'} draggable={false} />
        </Box>
      </Flex>
    </Flex>
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

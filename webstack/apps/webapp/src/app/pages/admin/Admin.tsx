/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  Input,
  useColorMode,
  InputGroup,
  InputLeftElement,
  IconButton,
  Tooltip,
  TableContainer,
  Table,
  Tbody,
  Td,
  Tfoot,
  Th,
  Thead,
  Tr,
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
import { fuzzySearch, SAGEColors } from '@sage3/shared';
import { MdRefresh, MdSearch } from 'react-icons/md';

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
    // Main Container
    <Box display="flex" flexDir={'column'} width="100%" height="100%" alignItems="center" justifyContent="space-between" py="2" px="2">
      {/* Middle Section */}

      <Box display="flex" flexDir="column" height="100%" minHeight={0} width="100%">
        <Box display="flex" justifyContent="left" gap="2">
          <Button onClick={handleBackToHome} colorScheme="teal" size="sm">
            Home
          </Button>
          <Button onClick={toggleColorMode} size="sm">
            {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
          </Button>
        </Box>

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
      </Box>

      {/* Bottom Bar */}
      <Box display="flex" flexDirection="row" justifyContent={'space-between'} width="100%" minHeight={'initial'} alignItems="center">
        <div></div>
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

type TableDataType<T> = SBDoc & { data: T };

interface TableViewerProps<T> {
  heading: string;
  data: TableDataType<T>[];
  columns: (keyof T | keyof SBDoc)[];
  onRefresh: () => void;
  actions?: {
    label: string;
    color: SAGEColors;
    onClick: (id: string) => void;
  }[];
}

function TableViewer<T>(props: TableViewerProps<T>): JSX.Element {
  const heading = props.heading;
  const data = props.data;
  const dataCount = data.length;
  const columns = props.columns;

  const TableHeader = (columns: (keyof T | keyof SBDoc)[]) => {
    return (
      <Thead>
        <Tr>
          {columns.map((column, i) => (
            <Th key={i}>{column.toString()}</Th>
          ))}
          {props.actions && <Th>Actions</Th>}
        </Tr>
      </Thead>
    );
  };

  const TableBody = (data: TableDataType<T>[], columns: (keyof T | keyof SBDoc)[]) => {
    return (
      <Tbody>
        {data.map((item, i) => {
          return (
            <Tr key={item._id}>
              {columns.map((column, j) => {
                // Check if column is in the root item
                if (column in item) {
                  // @ts-ignore
                  return <Td key={j}>{item[column]}</Td>;
                } else {
                  // Check if column is in the data object
                  // @ts-ignore
                  if (column in item.data) {
                    // @ts-ignore
                    return <Td key={j}>{item.data[column]}</Td>;
                  }
                }

                return <Td key={j}></Td>;
              })}
              {props.actions && (
                <Td>
                  {props.actions.map((action, j) => (
                    <Button key={j} mx={3} colorScheme={action.color} size="xs" onClick={() => action.onClick(item._id)}>
                      {action.label}
                    </Button>
                  ))}
                </Td>
              )}
            </Tr>
          );
        })}
      </Tbody>
    );
  };

  const TableFooter = (columns: (keyof T | keyof SBDoc)[]) => {
    return (
      <Tfoot>
        <Tr>
          {columns.map((column, i) => (
            <Th key={i}>{column.toString()}</Th>
          ))}
          {props.actions && <Th>Actions</Th>}
        </Tr>
      </Tfoot>
    );
  };

  // const [sortBy, setSortBy] = useState<keyof T>();
  //  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  //  const handleSort = (column: keyof T) => {
  //    if (sortBy === column) {
  //      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  //    } else {
  //      setSortBy(column);
  //      setSortOrder('asc');
  //    }
  //  };
  //  const sort = (a: T, b: T) => {
  //     if (!sortBy) return 0;
  //     // Handle sorting for different types
  //     if (typeof a[sortBy] === 'string') {
  //       if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1;
  //       if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1;
  //       return 0;
  //     }
  //     if (typeof a[sortBy] === 'number') {
  //       if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1;
  //       if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1;
  //       return 0;
  //     }
  //     return 0;
  //  };
  const [search, setSearch] = useState('');
  const searchFilter = (item: TableDataType<T>) => {
    // Get all the values from the selected columns and concat in to one string
    let values: Array<string | number | boolean> = [];
    columns.forEach((column) => {
      if (column in item) {
        // @ts-ignore
        const value = item[column];
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          values.push(value);
        }
      } else {
        // @ts-ignore
        if (column in item.data) {
          // @ts-ignore
          const value = item.data[column];
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            values.push(value);
          }
        }
      }
    });
    // Extract the values from the room object that are strings, numbers, or booleans
    const searchStr = values.join(' ');
    return fuzzySearch(searchStr, search);
  };
  // Chakra Table
  return (
    <>
      <Heading>
        {heading} ({dataCount})
      </Heading>

      <InputGroup my="2" colorScheme="teal">
        <InputLeftElement pointerEvents="none">
          <MdSearch color="gray.300" />
        </InputLeftElement>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" width="500px" />
        <Tooltip label="Refresh" aria-label="Refresh" hasArrow placement="top">
          <IconButton ml="2" aria-label="Home" icon={<MdRefresh />} onClick={props.onRefresh} />
        </Tooltip>
      </InputGroup>
      <TableContainer>
        <Table variant="striped" size="sm">
          {TableHeader(columns)}
          {TableBody(data.filter(searchFilter), columns)}
          {TableFooter(columns)}
        </Table>
      </TableContainer>
    </>
  );
}

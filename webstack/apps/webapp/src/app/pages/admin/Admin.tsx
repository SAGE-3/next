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
  useDisclosure,
  Text,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';

import { throttle } from 'throttle-debounce';
import { MdFileDownload, MdRefresh, MdSearch } from 'react-icons/md';

// Collection specific schemas
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
import { App, AppSchema } from '@sage3/applications/schema';

// Components
import { humanFileSize } from '@sage3/shared';
import { APIHttp, apiUrls, CollectionDocs, downloadFile, useRouteNav, useUser, AccountDeletion } from '@sage3/frontend';
import { TableViewer } from './components';

export function AdminPage() {
  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // Current User Information
  const { user } = useUser();
  const username = user?.data.name || 'Admin';
  const email = user?.data.email || '';
  const displayUserInfo = `${username} (${email})`;

  // Collections
  const [data, setData] = useState<any[]>([]);

  // Pre element for displaying messages
  const preRef = useRef<HTMLPreElement>(null);

  // Home navigation
  const { toHome } = useRouteNav();
  const handleBackToHome = () => {
    toHome();
  };

  // Toast Message
  const toast = useToast();

  // Chakra Toggle Color Mode
  const { toggleColorMode, colorMode } = useColorMode();

  // Fetch Data
  function fetchData<T extends CollectionDocs>(collection: string) {
    APIHttp.GET<T>(`/${collection}`).then((d) => {
      if (d.success && d.data) {
        setData(d.data);
      }
    });
  }

  // Tab Index
  const [tabIndex, setTabIndex] = useState(0);
  const handleTabChange = (index: number) => {
    setTabIndex(index);
    setSearch('');
    setSearchValue('');
    setData([]);
    if (index === 0) fetchData<Room>('rooms');
    if (index === 1) fetchData<Board>('boards');
    if (index === 2) fetchData<App>('apps');
    if (index === 3) fetchData<Asset>('assets');
    if (index === 4) fetchData<User>('users');
    if (index === 5) fetchData<Presence>('presence');
    if (index === 6) fetchData<Insight>('insight');
    if (index === 7) fetchData<Message>('message');
  };

  const handleRefreshData = () => {
    handleTabChange(tabIndex);
  };

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

  // Use Effect at launch of Admin Page
  useEffect(() => {
    // Update the document title
    document.title = 'SAGE3 - Admin';
    handleTabChange(0);
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

  // Delete an item
  const deleteItem = (id: string, collection: string) => {
    APIHttp.DELETE(`/${collection}/` + id).then((resp) => {
      if (resp.success) {
        toast({ title: 'Item Deleted', status: 'info', duration: 2000, isClosable: true });
      }
    });
  };

  // Search of the data
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

  // Account Deletion Modal Disclosure
  const { isOpen: accountDelIsOpen, onOpen: accountDelOnOpen, onClose: accountDelOnClose } = useDisclosure();
  const [accountDelUser, setAccountDelUser] = useState<User | null>(null);
  const handleAccountDeletion = (userId: string) => {
    const user = (data as User[]).find((u) => u._id === userId);
    if (!user) {
      // toast to inform user that the user was not found
      toast({ title: 'User not found', status: 'error', duration: 2000, isClosable: true });
      return;
    }
    setAccountDelUser(user);
    accountDelOnOpen();
  };

  // Handle download the data
  const handleDownloadData = () => {
    // Check if there is data to download
    if (data.length === 0) {
      toast({ title: 'No data to download', status: 'info', duration: 2000, isClosable: true });
      return;
    }
    // Create a blob and download the data
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date();
    a.download = `sage3_data_${date.toISOString()}.json`;
    a.click();
  };

  // Handle download asset
  const handleDownloadAsset = async (id: string) => {
    const asset = (data as Asset[]).find((a) => a._id === id);
    if (!asset) {
      toast({ title: 'Asset not found', status: 'error', duration: 2000, isClosable: true });
      return;
    }
    const filename = asset.data.originalfilename;
    const fileURL = apiUrls.assets.getAssetById(asset.data.file);
    downloadFile(fileURL, filename);
  };

  return (
    <Flex direction="column" align="center" minH="100vh" py="2" mx="4">
      {accountDelUser && <AccountDeletion user={accountDelUser} isOpen={accountDelIsOpen} onClose={accountDelOnClose} />}
      <Flex direction="column" width="100%" maxW="1600px" flex="1">
        {/* Top Section */}
        <Box as="header">
          <Box display="flex" justifyContent="space-between" alignItems={'center'}>
            <Box display="flex" gap="2">
              <Button onClick={handleBackToHome} colorScheme="teal" size="sm">
                Home
              </Button>
              <Button onClick={toggleColorMode} size="sm">
                {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
              </Button>
            </Box>

            <Text fontSize="2xl" my="0" fontWeight="bold">
              SAGE3 Admin Page
            </Text>
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
            <Text mt="3">Total Number of Elements: {data.length}</Text>
            {/* Search Input */}
            <Box display="flex" justifyContent={'space-between'} alignItems={'center'}>
              <InputGroup my="3" colorScheme="teal">
                <InputLeftElement pointerEvents="none">
                  <MdSearch color="gray.300" />
                </InputLeftElement>
                <Input value={search} onChange={(e) => handleSearchChange(e)} placeholder="Search" width="500px" />
              </InputGroup>
              <Box display="flex" gap="2">
                <Tooltip label="Download Data" aria-label="Refresh Data" placement="top" hasArrow>
                  <IconButton colorScheme="teal" icon={<MdRefresh />} variant={'outline'} onClick={handleRefreshData} aria-label={''} />
                </Tooltip>
                <Tooltip label="Download Data" aria-label="Download Data" placement="top" hasArrow>
                  <IconButton
                    colorScheme="teal"
                    icon={<MdFileDownload />}
                    variant={'outline'}
                    onClick={handleDownloadData}
                    aria-label={''}
                  />
                </Tooltip>
              </Box>
            </Box>

            <TabPanels flex="1" overflow="hidden" height="100%">
              <TabPanel p={0} height="100%">
                {TableViewer<RoomSchema>({
                  heading: 'Rooms',
                  data: data as Room[],
                  search: searchValue,
                  columns: ['_id', 'name', 'description', 'color'],
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'rooms') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<BoardSchema>({
                  heading: 'Boards',
                  data: data as Board[],
                  search: searchValue,
                  columns: ['_id', 'name', 'description', 'isPrivate'],
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'boards') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<AppSchema>({
                  heading: 'Apps',
                  data: data as App[],
                  search: searchValue,
                  columns: ['_id', 'type', 'title', 'boardId'],
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'apps') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<AssetSchema>({
                  heading: 'Assets',
                  data: data as Asset[],
                  search: searchValue,
                  columns: ['_id', 'originalfilename', 'mimetype', 'size'],
                  formatColumns: { size: (value) => humanFileSize(value) },
                  actions: [
                    { label: 'Download Asset', color: 'blue', onClick: (id) => handleDownloadAsset(id) },
                    { label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'assets') },
                  ],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<UserSchema>({
                  heading: 'Users',
                  data: data as User[],
                  search: searchValue,
                  columns: ['_id', 'email', 'name', 'color', 'userType', 'userRole'],
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => handleAccountDeletion(id) }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<PresenceSchema>({
                  heading: 'Presences',
                  data: data as Presence[],
                  search: searchValue,
                  columns: ['_id', 'userId', 'roomId', 'boardId'],
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'presence') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<InsightSchema>({
                  heading: 'Insights',
                  data: data as Insight[],
                  search: searchValue,
                  columns: ['_id', 'app_id', 'boardId', 'labels'],
                  actions: [{ label: 'Delete', color: 'red', onClick: (id) => deleteItem(id, 'insight') }],
                })}
              </TabPanel>
              <TabPanel p={0} height="100%">
                {TableViewer<MessageSchema>({
                  heading: 'Messages',
                  data: data as Message[],
                  search: searchValue,
                  columns: ['_id', 'type'],
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
          <Box display="flex" justifyContent={'space-between'} alignItems={'center'}>
            <Text>{displayUserInfo}</Text>
            <Image src={imageUrl} height="30px" style={{ opacity: 0.7 }} alt="sage3" userSelect={'auto'} draggable={false} />
          </Box>
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

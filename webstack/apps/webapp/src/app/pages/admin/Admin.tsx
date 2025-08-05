/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
import { Board, Asset, User, Room, Message, Presence, Insight, } from '@sage3/shared/types';
import { App } from '@sage3/applications/schema';

// Components
import { humanFileSize } from '@sage3/shared';
import { APIHttp, apiUrls, CollectionDocs, downloadFile, useRouteNav, useUser, AccountDeletion } from '@sage3/frontend';
import { TableViewer } from './components';

// Collection configuration for better organization
const COLLECTIONS = {
  rooms: { columns: ['_id', 'name', 'description', 'color'] as const },
  boards: { columns: ['_id', 'name', 'description', 'isPrivate'] as const },
  apps: { columns: ['_id', 'type', 'title', 'boardId'] as const },
  assets: { columns: ['_id', 'originalfilename', 'mimetype', 'size'] as const },
  users: { columns: ['_id', 'email', 'name', 'color', 'userType', 'userRole'] as const },
  presence: { columns: ['_id', 'userId', 'roomId', 'boardId'] as const },
  insight: { columns: ['_id', 'app_id', 'boardId', 'labels'] as const },
  message: { columns: ['_id', 'type'] as const },
} as const;

export function AdminPage() {
  // SAGE3 Image
  const imageUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');

  // Current User Information
  const { user } = useUser();
  const username = user?.data.name || 'Admin';
  const email = user?.data.email || '';
  const displayUserInfo = `${username} (${email})`;

  // Collections - use separate state for each collection to enable lazy loading
  const [collectionsData, setCollectionsData] = useState<Record<string, any[]>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, string>>({});

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

  // Fetch Data with loading states
  const fetchData = useCallback(async <T extends CollectionDocs>(collection: string) => {
    setLoadingStates(prev => ({ ...prev, [collection]: true }));
    setErrorStates(prev => ({ ...prev, [collection]: '' }));

    try {
      const response = await APIHttp.GET<T>(`/${collection}`);
      if (response.success && response.data) {
        setCollectionsData(prev => ({ ...prev, [collection]: response.data as any[] }));
      } else {
        setErrorStates(prev => ({ ...prev, [collection]: 'Failed to fetch data' }));
      }
    } catch (error) {
      setErrorStates(prev => ({ ...prev, [collection]: error instanceof Error ? error.message : 'Unknown error' }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [collection]: false }));
    }
  }, []);

  // Tab Index
  const [tabIndex, setTabIndex] = useState(0);
  const handleTabChange = useCallback((index: number) => {
    setTabIndex(index);
    setSearch('');
    setSearchValue('');

    // Get collection name from index
    const collectionNames = Object.keys(COLLECTIONS);
    const collectionName = collectionNames[index];

    // Only fetch if not already loaded
    if (!collectionsData[collectionName] && !loadingStates[collectionName]) {
      fetchData(collectionName);
    }
  }, [collectionsData, loadingStates, fetchData]);

  const handleRefreshData = useCallback(() => {
    const collectionNames = Object.keys(COLLECTIONS);
    const collectionName = collectionNames[tabIndex];
    fetchData(collectionName);
  }, [tabIndex, fetchData]);

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
  const deleteItem = useCallback((id: string, collection: string) => {
    APIHttp.DELETE(`/${collection}/` + id).then((resp) => {
      if (resp.success) {
        toast({ title: 'Item Deleted', status: 'info', duration: 2000, isClosable: true });
        // Refresh the current collection
        handleRefreshData();
      }
    });
  }, [toast, handleRefreshData]);

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
  const handleAccountDeletion = useCallback((userId: string) => {
    const collectionNames = Object.keys(COLLECTIONS);
    const collectionName = collectionNames[tabIndex];
    const data = collectionsData[collectionName] as User[];
    const user = data?.find((u) => u._id === userId);
    if (!user) {
      // toast to inform user that the user was not found
      toast({ title: 'User not found', status: 'error', duration: 2000, isClosable: true });
      return;
    }
    setAccountDelUser(user);
    accountDelOnOpen();
  }, [collectionsData, tabIndex, toast, accountDelOnOpen]);

  // Handle download the data
  const handleDownloadData = useCallback(() => {
    const collectionNames = Object.keys(COLLECTIONS);
    const collectionName = collectionNames[tabIndex];
    const data = collectionsData[collectionName];

    // Check if there is data to download
    if (!data || data.length === 0) {
      toast({ title: 'No data to download', status: 'info', duration: 2000, isClosable: true });
      return;
    }
    // Create a blob and download the data
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date();
    a.download = `sage3_${collectionName}_${date.toISOString()}.json`;
    a.click();
  }, [collectionsData, tabIndex, toast]);

  // Handle download asset
  const handleDownloadAsset = useCallback(async (id: string) => {
    const data = collectionsData.assets as Asset[];
    const asset = data?.find((a) => a._id === id);
    if (!asset) {
      toast({ title: 'Asset not found', status: 'error', duration: 2000, isClosable: true });
      return;
    }
    const filename = asset.data.originalfilename;
    const fileURL = apiUrls.assets.getAssetById(asset.data.file);
    downloadFile(fileURL, filename);
  }, [collectionsData, toast]);

  // Get current collection data and loading state
  const currentCollectionName = useMemo(() => {
    const collectionNames = Object.keys(COLLECTIONS);
    return collectionNames[tabIndex];
  }, [tabIndex]);

  const currentData = useMemo(() => {
    return collectionsData[currentCollectionName] || [];
  }, [collectionsData, currentCollectionName]);

  const isLoading = useMemo(() => {
    return loadingStates[currentCollectionName] || false;
  }, [loadingStates, currentCollectionName]);

  const error = useMemo(() => {
    return errorStates[currentCollectionName] || '';
  }, [errorStates, currentCollectionName]);

  // Get current collection configuration
  const collectionConfig = COLLECTIONS[currentCollectionName as keyof typeof COLLECTIONS];

  // Prepare table props based on current collection
  const getTableProps = () => {
    if (!collectionConfig) {
      return {
        heading: 'No Data',
        data: [],
        search: searchValue,
        columns: [],
        actions: []
      };
    }

    const baseProps = {
      search: searchValue,
      columns: collectionConfig.columns as any,
    };

    switch (currentCollectionName) {
      case 'rooms':
        return {
          ...baseProps,
          heading: 'Rooms',
          data: currentData as Room[],
          actions: [{ label: 'Delete', color: 'red' as const, onClick: (id: string) => deleteItem(id, 'rooms') }],
        };
      case 'boards':
        return {
          ...baseProps,
          heading: 'Boards',
          data: currentData as Board[],
          actions: [{ label: 'Delete', color: 'red' as const, onClick: (id: string) => deleteItem(id, 'boards') }],
        };
      case 'apps':
        return {
          ...baseProps,
          heading: 'Apps',
          data: currentData as App[],
          actions: [{ label: 'Delete', color: 'red' as const, onClick: (id: string) => deleteItem(id, 'apps') }],
        };
      case 'assets':
        return {
          ...baseProps,
          heading: 'Assets',
          data: currentData as Asset[],
          formatColumns: { size: (value: any) => humanFileSize(value) },
          actions: [
            { label: 'Download Asset', color: 'blue' as const, onClick: (id: string) => handleDownloadAsset(id) },
            { label: 'Delete', color: 'red' as const, onClick: (id: string) => deleteItem(id, 'assets') },
          ],
        };
      case 'users':
        return {
          ...baseProps,
          heading: 'Users',
          data: currentData as User[],
          actions: [{ label: 'Delete', color: 'red' as const, onClick: (id: string) => handleAccountDeletion(id) }],
        };
      case 'presence':
        return {
          ...baseProps,
          heading: 'Presences',
          data: currentData as Presence[],
          actions: [{ label: 'Delete', color: 'red' as const, onClick: (id: string) => deleteItem(id, 'presence') }],
        };
      case 'insight':
        return {
          ...baseProps,
          heading: 'Insights',
          data: currentData as Insight[],
          actions: [{ label: 'Delete', color: 'red' as const, onClick: (id: string) => deleteItem(id, 'insight') }],
        };
      case 'message':
        return {
          ...baseProps,
          heading: 'Messages',
          data: currentData as Message[],
          actions: [{ label: 'Delete', color: 'red' as const, onClick: (id: string) => deleteItem(id, 'message') }],
        };
      default:
        return {
          ...baseProps,
          heading: 'No Data',
          data: [],
          actions: []
        };
    }
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
            <Text mt="3">Total Number of Elements: {currentData.length}</Text>
            {/* Search Input */}
            <Box display="flex" justifyContent={'space-between'} alignItems={'center'}>
              <InputGroup my="3" colorScheme="teal">
                <InputLeftElement pointerEvents="none">
                  <MdSearch color="gray.300" />
                </InputLeftElement>
                <Input value={search} onChange={(e) => handleSearchChange(e)} placeholder="Search" width="500px" />
              </InputGroup>
              <Box display="flex" gap="2">
                <Tooltip label="Refresh Data" aria-label="Refresh Data" placement="top" hasArrow>
                  <IconButton
                    colorScheme="teal"
                    icon={<MdRefresh />}
                    variant={'outline'}
                    onClick={handleRefreshData}
                    aria-label={''}
                    isLoading={isLoading}
                  />
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
                <TableViewer {...getTableProps() as any} isLoading={isLoading} error={error} />
              </TabPanel>
              <TabPanel p={0} height="100%">
                <TableViewer {...getTableProps() as any} isLoading={isLoading} error={error} />
              </TabPanel>
              <TabPanel p={0} height="100%">
                <TableViewer {...getTableProps() as any} isLoading={isLoading} error={error} />
              </TabPanel>
              <TabPanel p={0} height="100%">
                <TableViewer {...getTableProps() as any} isLoading={isLoading} error={error} />
              </TabPanel>
              <TabPanel p={0} height="100%">
                <TableViewer {...getTableProps() as any} isLoading={isLoading} error={error} />
              </TabPanel>
              <TabPanel p={0} height="100%">
                <TableViewer {...getTableProps() as any} isLoading={isLoading} error={error} />
              </TabPanel>
              <TabPanel p={0} height="100%">
                <TableViewer {...getTableProps() as any} isLoading={isLoading} error={error} />
              </TabPanel>
              <TabPanel p={0} height="100%">
                <TableViewer {...getTableProps() as any} isLoading={isLoading} error={error} />
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

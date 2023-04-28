/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { APIHttp, EnterBoardModal, useAppStore, useHexColor, usePresenceStore, useUser, useUsersStore } from '@sage3/frontend';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  Heading,
  Stack,
  Tooltip,
  useDisclosure,
  Text,
  useColorModeValue,
  IconButton,
  Icon,
  Image,
} from '@chakra-ui/react';
import { App, AppName } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { Board, Position, Size } from '@sage3/shared/types';
import { useState, useEffect, useCallback } from 'react';
import { MdLock, MdLockOpen, MdPerson, MdRefresh } from 'react-icons/md';

/* App component for BoardLink */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const [board, setBoard] = useState<undefined | Board>(undefined);
  const { isOpen: enterBoardIsOpen, onOpen: enterBoardOnOpen, onClose: enterBoardOnClose } = useDisclosure();
  const boardId = s.url.split('/')[s.url.split('/').length - 1];
  const logoUrl = useColorModeValue('/assets/background-boardlink.png', '/assets/background-boardlink.png');
  const { user } = useUser();
  // Get presences of users
  let presences = usePresenceStore((state) => state.presences);

  // Filter out the users who are not present on the board and is not the current user
  presences = presences.filter((el) => el.data.boardId === boardId);

  const dividerColor = useColorModeValue('gray.300', 'gray.600');
  const lockColor = useHexColor('red');
  const unlockColor = useHexColor('green');

  // Apps
  const [appInfo, setAppInfo] = useState<{ position: Position; size: Size; type: AppName; id: string }[]>([]);
  const [boardWidth, setBoardWidth] = useState(0);
  const [boardHeight, setBoardHeight] = useState(0);
  const [appsX, setAppsX] = useState(0);
  const [appsY, setAppsY] = useState(0);
  const [mapScale, setMapScale] = useState(1);

  // Last Update
  const [lastUpdate, setLastUpdate] = useState(0);
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState('Updating...');

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  async function updateAppInfo() {
    const res = await APIHttp.QUERY<App>('/apps', { boardId });
    if (res.success && res.data) {
      const apps = res.data;
      const appArray = [] as { position: Position; size: Size; type: AppName; id: string }[];
      apps.forEach((app) => {
        const aInfo = { position: app.data.position, size: app.data.size, type: app.data.type, id: app._id };
        appArray.push(aInfo);
      });
      const appsLeft = apps.map((app) => app.data.position.x);
      const appsRight = apps.map((app) => app.data.position.x + app.data.size.width);
      const appsTop = apps.map((app) => app.data.position.y);
      const appsBottom = apps.map((app) => app.data.position.y + app.data.size.height);

      const width = Math.max(...appsRight) - Math.min(...appsLeft);
      const height = Math.max(...appsBottom) - Math.min(...appsTop);

      const mapScale = Math.min(400 / width, 250 / height) * 0.95;
      const x = Math.min(...appsLeft);
      const y = Math.min(...appsTop);

      setBoardHeight(height * mapScale);
      setBoardWidth(width * mapScale);
      setAppsX(x);
      setAppsY(y);
      setMapScale(mapScale);
      setAppInfo(appArray);
    }
  }

  async function updateBoardInfo() {
    const res = await fetch(`/api/boards/${boardId}`);
    const data = await res.json();
    if (data.success) {
      setBoard(data.data[0]);
    }
    return;
  }

  function updateInfo() {
    setTimeSinceLastUpdate('Updating...');
    updateBoardInfo();
    updateAppInfo();
    setTimeout(() => {
      setLastUpdate(Date.now());
    }, 1000);
  }

  // Update time sincel ast update ui every 30 secs
  useEffect(() => {
    const updateTimesinceLastUpdate = () => {
      if (lastUpdate > 0) {
        const delta = Date.now() - lastUpdate;
        setTimeSinceLastUpdate(formatDuration(delta));
      }
    };
    updateTimesinceLastUpdate();
    const interval = setInterval(() => {
      updateTimesinceLastUpdate();
    }, 1000 * 30); // 30 seconds
    return () => clearInterval(interval);
  }, [lastUpdate]);

  // Update info every 5 minutes
  useEffect(() => {
    updateInfo();
    const interval = setInterval(() => {
      updateInfo();
    }, 5 * 1000 * 60); // 5 minutes
    return () => clearInterval(interval);
  }, [s.url]);

  useEffect(() => {
    updateInfo();
  }, []);

  const goToBoardFinish = () => {
    enterBoardOnClose();
  };

  return (
    <AppWindow app={props} processing={!board} disableResize={true}>
      <Box width="100%" height="100%" display="flex" flexDir="column" justifyContent={'center'} alignItems={'center'}>
        {board && <EnterBoardModal board={board} isOpen={enterBoardIsOpen} onClose={goToBoardFinish} />}

        {/* Mini map */}
        <Box
          width="400px"
          height="250px"
          // backgroundImage={}
          backgroundSize="contain"
          p="2"
          backgroundColor={`${board?.data.color}.400`}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Box position="relative" height={boardHeight} width={boardWidth}>
            {appInfo.map((app) => {
              return (
                <Box
                  backgroundColor={'gray.100'}
                  position="absolute"
                  left={(app.position.x - appsX) * mapScale + 'px'}
                  top={(app.position.y - appsY) * mapScale + 'px'}
                  width={app.size.width * mapScale + 'px'}
                  height={app.size.height * mapScale + 'px'}
                  transition={'all .5s'}
                  borderWidth="1px"
                  borderStyle="solid"
                  borderColor={'gray'}
                  borderRadius="sm"
                ></Box>
              );
            })}
          </Box>
        </Box>

        {/* Info Sections */}
        <Box
          display="flex"
          flexDir={'column'}
          justifyContent={'space-between'}
          height="125px"
          width="400px"
          p="3"
          pt="1"
          borderTop="solid 4px"
          borderColor={dividerColor}
          background={linearBGColor}
        >
          <Box width="100%" display="flex" justifyContent={'space-between'}>
            <Box width="80%">
              <Heading size="lg" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" width="100%">
                {board?.data.name}
              </Heading>
              <Text whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" width="100%" size="md">
                {board?.data.description}
              </Text>
            </Box>
            <Box display="flex">
              <Text fontSize="28px">{presences.length}</Text>
              <Icon as={MdPerson} fontSize="28px" transform={'translateY(8px)'}></Icon>
              <Icon
                aria-label="LockBoard"
                fontSize="26px"
                pointerEvents="none"
                color={board?.data.isPrivate ? lockColor : unlockColor}
                m="0"
                p="0"
                transform={'translateY(9px)'}
                _hover={{ cursor: 'initial' }}
                as={board?.data.isPrivate ? MdLock : MdLockOpen}
              />
            </Box>
          </Box>

          <Box width="100%" display="flex" justifyContent={'left'}></Box>

          <Box display="flex" justifyContent={'space-between'}>
            <Box display="flex">
              <Tooltip label="Refresh" openDelay={500} hasArrow placement="top">
                <IconButton variant="solid" size="sm" onClick={updateInfo} aria-label={'Refresh'} icon={<MdRefresh></MdRefresh>} />
              </Tooltip>
              <Text size="xss" transform={'translateY(4px)'} ml="2">
                {timeSinceLastUpdate}
              </Text>
            </Box>
            <Box>
              <Image height="35px" src={logoUrl} transform="translateX(12px)"></Image>
            </Box>

            {/* <Button variant="solid" ml="2" colorScheme="green" size="sm" onClick={enterBoardOnOpen}>
              Enter
            </Button> */}
          </Box>
        </Box>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app BoardLink */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const [board, setBoard] = useState<undefined | Board>(undefined);
  const { isOpen: enterBoardIsOpen, onOpen: enterBoardOnOpen, onClose: enterBoardOnClose } = useDisclosure();

  const boardId = s.url.split('/')[s.url.split('/').length - 1];
  useEffect(() => {
    async function fetchUrl() {
      const res = await fetch(`/api/boards/${boardId}`);
      const data = await res.json();
      if (data.success) {
        setBoard(data.data[0]);
      }
    }
    fetchUrl();
    // Get board info
  }, [s.url]);

  const goToBoardFinish = () => {
    enterBoardOnClose();
  };

  return (
    <>
      {board && <EnterBoardModal board={board} isOpen={enterBoardIsOpen} onClose={goToBoardFinish} />}
      <Button colorScheme="green" size="xs" disabled={!board} onClick={enterBoardOnOpen}>
        Enter Board
      </Button>
    </>
  );
}

function formatDuration(ms: number) {
  if (ms < 0) ms = -ms;
  const mins = Math.floor(ms / 60000) % 60;
  if (mins > 0) {
    return `Refreshed ${mins} minutes ago`;
  } else {
    return `Refreshed less than a minute ago`;
  }
}

export default { AppComponent, ToolbarComponent };

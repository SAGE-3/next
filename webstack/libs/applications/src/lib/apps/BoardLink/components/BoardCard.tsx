/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useState, useEffect } from 'react';
import { Box, Heading, Tooltip, Text, useColorModeValue, IconButton, Icon, Image, Spacer } from '@chakra-ui/react';
import { MdLock, MdPerson, MdRefresh } from 'react-icons/md';

import { APIHttp, apiUrls, useThrottlePresenceUsers } from '@sage3/frontend';
import { Board, Position, Size } from '@sage3/shared/types';

import { App, AppName, AppState } from '../../../schema';

/* App component for BoardLink */

export function BoardCard(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Board
  const [board, setBoard] = useState<undefined | Board>(undefined);
  const boardId = s.url.split('/')[s.url.split('/').length - 1];

  // Image
  const logoUrl = useColorModeValue('/assets/background-boardlink-dark.png', '/assets/background-boardlink.png');

  // Get presences of users
  let presences = useThrottlePresenceUsers(5000, '', boardId);
  presences = presences.filter((el) => el.presence.data.boardId === boardId);

  // UI Stuff
  const dividerColor = useColorModeValue('gray.300', 'gray.600');
  // const lockColor = useHexColor('red');
  // const unlockColor = useHexColor('green');

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
    const res = await fetch(apiUrls.boards.getBoard(boardId));
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

  // Update time since last update ui every 30 secs
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

  return (
    <Box width="100%" height="100%" display="flex" flexDir="column" justifyContent={'center'} alignItems={'center'}>
      {/* Mini map */}
      <Box
        width="400px"
        height="250px"
        // backgroundImage={}
        backgroundSize="contain"
        p="2"
        backgroundColor={`blue.400`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        textAlign={'center'}
        flexDir={'column'}
      >
        {board?.data.isPrivate ? (
          <>
            <Icon
              aria-label="LockBoard"
              fontSize="96px"
              pointerEvents="none"
              color={'white'}
              m="0"
              p="0"
              _hover={{ cursor: 'initial' }}
              as={MdLock}
              textAlign={'center'}
              mb={2}
            />

            <Text fontSize="2xl" mb="2" color="white" fontWeight="bold">
              This board is private.
            </Text>
          </>
        ) : appInfo.length > 0 ? (
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
                  key={app.id}
                ></Box>
              );
            })}
          </Box>
        ) : (
          <Text fontSize="2xl" mb="2" color="white" fontWeight="bold">
            This board has no opened applications.
          </Text>
        )}
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

          <Spacer />

          <Box>
            <Image height="32px" src={logoUrl}></Image>
          </Box>

          {/* <Button variant="solid" ml="2" colorScheme="green" size="sm" onClick={enterBoardOnOpen}>
              Enter
            </Button> */}
        </Box>
      </Box>
    </Box>
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

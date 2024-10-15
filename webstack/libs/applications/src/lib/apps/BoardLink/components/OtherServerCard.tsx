/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useState, useEffect } from 'react';
import { Box, Heading, Tooltip, Text, useColorModeValue, IconButton, Image, Icon, Spacer } from '@chakra-ui/react';
import { MdExitToApp, MdRefresh } from 'react-icons/md';

import { PublicInformation } from '@sage3/shared/types';
import { apiUrls } from '@sage3/frontend';

import { App, AppState } from '../../../schema';

export function OtherServerCard(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // Other Server URl
  const serverURL = 'https://' + new URL(s.url.replace('sage3://', 'https://')).host;

  // Server Info
  const [server, setServerInfo] = useState<PublicInformation | undefined>(undefined);

  // Image
  const logoUrl = useColorModeValue('/assets/background-boardlink-dark.png', '/assets/background-boardlink.png');

  // UI Stuff
  const dividerColor = useColorModeValue('gray.300', 'gray.600');

  // Last Update
  const [lastUpdate, setLastUpdate] = useState(0);
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState('Updating...');

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  async function refreshServerInfo() {
    const res = await fetch(serverURL + apiUrls.misc.getInfo);
    const data = await res.json();
    if (data) {
      setServerInfo(data);
    }
    return;
  }

  function refreshInfo() {
    setTimeSinceLastUpdate('Updating...');
    refreshServerInfo();
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
    refreshInfo();
    const interval = setInterval(() => {
      refreshInfo();
    }, 5 * 1000 * 60); // 5 minutes
    return () => clearInterval(interval);
  }, [s.url]);

  useEffect(() => {
    refreshInfo();
  }, []);

  return (
    <Box width="100%" height="100%" display="flex" flexDir="column" justifyContent={'center'} alignItems={'center'}>
      <Box
        width="400px"
        height="250px"
        backgroundSize="contain"
        p="2"
        backgroundColor={`teal.400`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        textAlign={'center'}
        flexDir={'column'}
      >
        <Icon
          aria-label="LockBoard"
          fontSize="96px"
          pointerEvents="none"
          color={'white'}
          m="0"
          p="0"
          as={MdExitToApp}
          textAlign={'center'}
          mb={2}
        />

        <Text fontSize="2xl" mb="2" color="white" fontWeight="bold">
          {s.cardTitle === undefined ? 'This board ' : s.cardTitle} is hosted on the "{server?.serverName}" hub.
        </Text>
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
              {s.cardTitle} Board
            </Heading>
            <Text whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" width="100%" size="md">
              {server?.serverName} Hub
            </Text>
          </Box>
          <Box display="flex"></Box>
        </Box>

        <Box width="100%" display="flex" justifyContent={'left'}></Box>

        <Box display="flex" justifyContent={'space-between'}>
          <Box display="flex">
            <Tooltip label="Refresh" openDelay={500} hasArrow placement="top">
              <IconButton variant="solid" size="sm" onClick={refreshInfo} aria-label={'Refresh'} icon={<MdRefresh></MdRefresh>} />
            </Tooltip>
            <Text size="xss" transform={'translateY(4px)'} ml="2">
              {timeSinceLastUpdate}
            </Text>
          </Box>
          <Spacer />
          <Box>
            <Image height="35px" src={logoUrl}></Image>
          </Box>
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

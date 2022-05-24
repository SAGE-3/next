/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { ChangeEvent, useEffect, useState } from 'react';

import { Box, Image, Center, Text, useColorMode, Select, InputGroup } from '@chakra-ui/react';

import { LoginDialog, PageLayout } from '@sage3/frontend/components';
import { useNavigate } from 'react-router-dom';
import { GetConfiguration, serverConfiguration, useUser } from '@sage3/frontend/services';

import sage3DarkMode from '../../../assets/SAGE3DarkMode.png';
import sage3LightMode from '../../../assets/SAGE3LightMode.png';

export function Login(): JSX.Element {
  const user = useUser();
  const navigate = useNavigate();
  const { colorMode } = useColorMode();
  const [serverName, setServerName] = useState<string>('');
  const [serverList, setServerList] = useState<{ name: string; url: string }[]>();
  // state to disable login buttons during server switch: default is enabled
  const [shouldDisable, setShouldDisable] = useState(false);

  // Retrieve the name of the server to display in the page
  useEffect(() => {
    GetConfiguration().then((conf) => {
      if (conf.serverName) setServerName(conf.serverName);
      const servers = conf.servers;
      setServerList(servers);
    });
  }, []);

  // Redirects if user not logged in
  if (user.isAuthenticated) navigate('/home', { replace: true });

  // Callback when selection os done
  const redirectHost = (e: ChangeEvent<HTMLSelectElement>) => {
    // Disable the login buttons
    setShouldDisable(true);
    // value selected
    const host = e.target.value;
    if (serverList) {
      // find the matching name
      const idx = serverList.findIndex((s) => s.name === host);
      if (idx !== -1) {
        // do the navigation
        window.location.href = serverList[idx].url;
      }
    }
  };

  return (
    <PageLayout login={true}>
      <Box position="absolute" top="30%" left="50%" transform="translateX(-50%)">
        <Box pb={'2rem'} alignItems="center">
          <Image
            width="20vw"
            minWidth="400px"
            maxWidth="35rem"
            src={colorMode === 'light' ? sage3LightMode : sage3DarkMode}
            alt="SAGE3 Logo"
            fit="contain"
          />
        </Box>
        <Center>
          <Text mr={'.5rem'}>Host: {serverName || '-'}</Text>
        </Center>
        <Center mt="1rem" fontSize="lg">
          <InputGroup width="17rem">
            {/* Display the list of servers in a selectable list */}
            <Select placeholder="Select a server" value={serverName} onChange={redirectHost}>
              {serverList?.map((s, idx) => (
                <option key={idx} value={s.name}>
                  {s.name}
                </option>
              ))}
            </Select>
          </InputGroup>
        </Center>

        <Box borderRadius="3xl" d="flex" pb={3} mt={5} justifyContent="center" alignItems="flex-start">
          {/* props shouldDisable: the login buttons enabled or not */}
          <LoginDialog shouldDisable={shouldDisable} />
        </Box>
      </Box>
    </PageLayout>
  );
}

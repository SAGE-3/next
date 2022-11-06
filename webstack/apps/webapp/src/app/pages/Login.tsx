/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useCallback, useState } from 'react';

import { Button, ButtonGroup, IconButton, Box, useColorMode, Image, Center, Text, VStack, Select, InputGroup } from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { FaGhost } from 'react-icons/fa';

import { useAuth, useRouteNav } from '@sage3/frontend';
import { GetServerInfo } from '@sage3/frontend';

// Logos
import sage3DarkMode from '../../assets/SAGE3DarkMode.png';
import sage3LightMode from '../../assets/SAGE3LightMode.png';
import cilogonLogo from '../../assets/cilogon-logo-32x32.png';

export function LoginPage() {
  const { auth, googleLogin, ciLogin, guestLogin } = useAuth();
  const { toHome } = useRouteNav();
  // Server name and list
  const [serverName, setServerName] = useState<string>('');
  const [serverList, setServerList] = useState<{ name: string; url: string }[]>();
  // state to disable login buttons during server switch: default is enabled
  const [shouldDisable, setShouldDisable] = useState(false);

  // Retrieve the name of the server to display in the page
  useEffect(() => {
    GetServerInfo().then((conf) => {
      if (conf.serverName) setServerName(conf.serverName);
      const servers = conf.servers;
      setServerList(servers);
    });
  }, []);

  // Callback when selection os done
  const redirectHost = (e: React.ChangeEvent<HTMLSelectElement>) => {
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

  const authNavCheck = useCallback(() => {
    if (auth) {
      toHome();
    }
  }, [auth]);

  useEffect(() => {
    authNavCheck();
  }, [authNavCheck]);

  //  Dark/light mode
  const { colorMode } = useColorMode();

  // Detect if in production or development mode
  let production = true;
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    production = false;
  }

  return (
    <Box display="flex" flexDir={'column'} justifyContent="center" alignItems="center" width="100%" height="100%">
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
        <Text fontSize={'lg'}>Current Server: {serverName || '-'}</Text>
      </Center>
      <Center my="1rem" fontSize="lg">
        <InputGroup width="17rem">
          {/* Display the list of servers in a selectable list */}
          <Select placeholder="Switch to server" value={serverName} onChange={redirectHost}>
            {serverList?.map((s, idx) => (
              <option key={idx} value={s.name}>
                {s.name}
              </option>
            ))}
          </Select>
        </InputGroup>
      </Center>

      <Box width="300px">
        <VStack spacing={4}>
          {/* Google Auth Service */}
          <ButtonGroup isAttached size="lg" width="100%">
            <IconButton
              width="80px"
              aria-label="Login with Google"
              icon={<FcGoogle size="30" width="50px" />}
              pointerEvents="none"
              borderRight={`3px solid`}
              borderColor={colorMode === 'light' ? 'gray.50' : 'gray.900'}
            />
            <Button width="100%" disabled={false} justifyContent="left" onClick={googleLogin}>
              Login with Google
            </Button>
          </ButtonGroup>

          {/* CILogon Auth Service */}
          <ButtonGroup isAttached size="lg" width="100%">
            <IconButton
              width="80px"
              aria-label="Login with Google"
              icon={<Image src={cilogonLogo} alt="CILogon Logo" />}
              pointerEvents="none"
              borderRight={`3px solid`}
              borderColor={colorMode === 'light' ? 'gray.50' : 'gray.900'}
            />
            <Button width="100%" disabled={!production} justifyContent="left" onClick={ciLogin}>
              Login with CILogon
            </Button>
          </ButtonGroup>

          {/* Guest Auth Service */}
          <ButtonGroup isAttached size="lg" width="100%">
            <IconButton
              width="80px"
              aria-label="Login with Google"
              icon={<FaGhost size="30" width="50px" />}
              pointerEvents="none"
              borderRight={`3px solid`}
              borderColor={colorMode === 'light' ? 'gray.50' : 'gray.900'}
            />
            <Button width="100%" disabled={false} justifyContent="left" onClick={guestLogin}>
              Login as Guest
            </Button>
          </ButtonGroup>
        </VStack>
      </Box>
    </Box>
  );
}

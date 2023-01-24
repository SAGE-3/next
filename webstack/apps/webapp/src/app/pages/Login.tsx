/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useCallback, useState } from 'react';

import { Button, ButtonGroup, IconButton, Box, useColorMode, Image, Center, Text, VStack, Select, InputGroup } from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { FaGhost } from 'react-icons/fa';

import { isElectron, useAuth, useRouteNav } from '@sage3/frontend';
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
  // state to disable login buttons during server switch: default is enabled
  const [shouldDisable, setShouldDisable] = useState(false);

  const isElec = isElectron();

  // Retrieve the name of the server to display in the page
  useEffect(() => {
    GetServerInfo().then((conf) => {
      if (conf.serverName) setServerName(conf.serverName);
    });
  }, []);

  // Sending user back to the electron landing page
  const goToLanding = () => {
    window.electron.send('load-landing');
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

      {/* Server Name */}
      <Box left="2" top="1" position="absolute">
        <Text
          fontSize="xl"
          flex="1 1 0px"
          textOverflow={'ellipsis'}
          overflow={'hidden'}
          justifyContent="left"
          display="flex"
          width="100%"
          userSelect="none"
          whiteSpace={'nowrap'}
        >
          {serverName}
        </Text>
      </Box>

      {isElec && (
        <Box left="2" bottom="2" position="absolute">
          <Button colorScheme="teal" size="sm" onClick={goToLanding}>
            Server List
          </Button>
        </Box>
      )}

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
            <Button width="100%" disabled={shouldDisable} justifyContent="left" onClick={googleLogin}>
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
            <Button width="100%" disabled={shouldDisable || !production} justifyContent="left" onClick={ciLogin}>
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
            <Button width="100%" disabled={shouldDisable} justifyContent="left" onClick={guestLogin}>
              Login as Guest
            </Button>
          </ButtonGroup>
        </VStack>
      </Box>
    </Box>
  );
}

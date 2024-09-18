/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useCallback, useState } from 'react';

import { Button, ButtonGroup, IconButton, Box, useColorMode, Image, Text, VStack, useColorModeValue } from '@chakra-ui/react';

import { FcGoogle } from 'react-icons/fc';
import { FaGhost, FaApple } from 'react-icons/fa';

import { isElectron, useAuth, useRouteNav, GetServerInfo } from '@sage3/frontend';

// Logos
import cilogonLogo from '../../../assets/cilogon.png';

export function LoginPage() {
  const { auth, googleLogin, appleLogin, ciLogin, guestLogin, spectatorLogin } = useAuth();
  const { toHome } = useRouteNav();
  // Server name and list
  const [serverName, setServerName] = useState<string>('');
  // state to disable login buttons during server switch: default is enabled
  const [shouldDisable, setShouldDisable] = useState(false);
  const [logins, setLogins] = useState<string[]>([]);
  // Logo URL
  const logoUrl = useColorModeValue('/assets/SAGE3LightMode.png', '/assets/SAGE3DarkMode.png');
  // Test for electron
  const thisIsElectron = isElectron();

  // Retrieve the name of the server to display in the page
  useEffect(() => {
    // Update the document title
    document.title = 'SAGE3 - Login';

    GetServerInfo().then((conf) => {
      if (conf.serverName) setServerName(conf.serverName);
      if (conf.logins) setLogins(conf.logins);
    });
  }, []);

  // Sending user back to the electron landing page
  const goToLanding = () => {
    // Disable login buttons
    setShouldDisable(true);
    // Send message to electron to load the landing page
    window.electron.send('load-landing');
  };

  // Button to download the client
  const goToClientDownload = () => {
    window.open('https://sage3.sagecommons.org/', '_blank');
  };

  // Make sure user is logged in or not
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

  return (
    <Box display="flex" flexDir={'column'} justifyContent="center" alignItems="center" width="100%" height="100%" position="relative">
      <Box pb={'2rem'} alignItems="center">
        <Image aspectRatio={2.55} width="20vw" minWidth="400px" maxWidth="35rem" src={logoUrl} alt="SAGE3 Logo" fit="contain" />
      </Box>

      {/* Server Name */}
      <Box left="2" top="5" position="absolute">
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

      {thisIsElectron ? (
        <Box left="2" bottom="2" position="absolute">
          <Button colorScheme="teal" size="sm" onClick={goToLanding}>
            Hub List
          </Button>
        </Box>
      ) : (
        <Box left="2" bottom="2" position="absolute">
          <Button colorScheme="teal" size="sm" onClick={goToClientDownload}>
            Download Client
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
              borderColor={colorMode === 'light' ? 'gray.50' : 'gray.800'}
            />
            <Button width="100%" isDisabled={shouldDisable || !logins.includes('google')} justifyContent="left" onClick={googleLogin}>
              Login with Google
            </Button>
          </ButtonGroup>

          {/* Apple Auth Service */}
          <ButtonGroup isAttached size="lg" width="100%">
            <IconButton
              width="80px"
              aria-label="Login with Apple"
              icon={<FaApple size="30" width="50px" />}
              pointerEvents="none"
              borderRight={`3px solid`}
              borderColor={colorMode === 'light' ? 'gray.50' : 'gray.800'}
            />
            <Button width="100%" isDisabled={shouldDisable || !logins.includes('apple')} justifyContent="left" onClick={appleLogin}>
              Login with Apple
            </Button>
          </ButtonGroup>

          {/* CILogon Auth Service */}
          <ButtonGroup isAttached size="lg" width="100%">
            <IconButton
              width="80px"
              aria-label="Login with Google"
              icon={<Image w="36px" h="36px" src={cilogonLogo} alt="CILogon Logo" />}
              pointerEvents="none"
              borderRight={`3px solid`}
              borderColor={colorMode === 'light' ? 'gray.50' : 'gray.800'}
            />
            <Button width="100%" isDisabled={shouldDisable || !logins.includes('cilogon')} justifyContent="left" onClick={ciLogin}>
              Login with CILogon
            </Button>
          </ButtonGroup>

          {/* Guest Auth Service */}
          <ButtonGroup isAttached size="lg" width="100%">
            <IconButton
              width="80px"
              aria-label="Login with Guest"
              icon={<FaGhost size="30" width="50px" />}
              pointerEvents="none"
              borderRight={`3px solid`}
              borderColor={colorMode === 'light' ? 'gray.50' : 'gray.800'}
            />
            <Button width="100%" isDisabled={shouldDisable || !logins.includes('guest')} justifyContent="left" onClick={guestLogin}>
              Login as Guest
            </Button>
          </ButtonGroup>
        </VStack>
      </Box>
    </Box>
  );
}

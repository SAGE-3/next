/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ButtonGroup, IconButton, Box, useColorMode, Image, Center, Text, VStack } from '@chakra-ui/react';

import { useAuth } from '@sage3/frontend';

import { FcGoogle } from 'react-icons/fc';
import { FaGhost } from 'react-icons/fa';

// Logos
import sage3DarkMode from '../../assets/SAGE3DarkMode.png';
import sage3LightMode from '../../assets/SAGE3LightMode.png';
import cilogonLogo from '../../assets/cilogon-logo-32x32.png';

export function LoginPage() {
  const { auth, googleLogin, ciLogin, guestLogin } = useAuth();
  const navigate = useNavigate();

  const authNavCheck = useCallback(() => {
    if (auth) {
      navigate('/home');
    }
  }, [auth, navigate]);

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

      {/* <Center>
        <Text mr={'.5rem'}>Host: serverName </Text>
      </Center> */}

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

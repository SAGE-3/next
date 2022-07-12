/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */


import {
  Button, ButtonGroup, IconButton,
  Box, useColorMode, Image, Center, Text, VStack
} from '@chakra-ui/react';

import { BgColor, useAuth } from '@sage3/frontend';
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { FcGoogle } from 'react-icons/fc';
import { FaGhost } from 'react-icons/fa';

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
  const { colorMode } = useColorMode()

  // Detect if in production or development mode
  let production = true;
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    production = false;
  }

  return (
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

      {/* <Center>
        <Text mr={'.5rem'}>Host: serverName </Text>
      </Center> */}

      <Box w="25rem">
        <VStack spacing={4}>
          {/* Google Auth Service */}
          <ButtonGroup isAttached width="18rem" size="lg">
            <IconButton
              width="6rem"
              px="1rem"
              aria-label="Login with Google"
              icon={<FcGoogle size="25" />}
              pointerEvents="none"
              borderRight={`3px ${BgColor()} solid`}
            />
            <Button
              width="18rem"
              pl="1rem"
              _hover={{ bg: 'teal.200', color: 'rgb(26, 32, 44)' }}
              justifyContent="flex-start"
              disabled={!production}
              onClick={googleLogin}
            >
              Login with Google
            </Button>
          </ButtonGroup>

          {/* CILogon Auth Service */}
          <ButtonGroup isAttached width="18rem" size="lg">
            <IconButton
              width="6rem"
              px="1rem"
              aria-label="Login wit CILogon"
              icon={<Image src={cilogonLogo} width="25px" />}
              pointerEvents="none"
              borderRight={`3px ${BgColor()} solid`}
            />
            <Button
              width="18rem"
              pl="1rem"
              _hover={{ bg: 'teal.200', color: 'rgb(26, 32, 44)' }}
              justifyContent="flex-start"
              disabled={!production}
              onClick={ciLogin}
            >
              Login with CILogon
            </Button>
          </ButtonGroup>

          {/* Guest Auth Service */}
          <ButtonGroup isAttached width="18rem" size="lg">
            <IconButton
              width="6rem"
              px="1rem"
              aria-label="Login as Guest"
              icon={<FaGhost size="25" color="gray" />}
              pointerEvents="none"
              borderRight={`3px ${BgColor()} solid`}
            />
            <Button
              width="18rem"
              pl="1rem"
              _hover={{ bg: 'teal.200', color: 'rgb(26, 32, 44)' }}
              justifyContent="flex-start"
              onClick={guestLogin}
            >
              Login as Guest
            </Button>
          </ButtonGroup>

        </VStack>
      </Box>


    </Box >
  );
}

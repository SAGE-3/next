/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useCallback, useState } from 'react';

import { Button, ButtonGroup, IconButton, Box, useColorMode, Image, Text, VStack, useColorModeValue } from '@chakra-ui/react';

import { FcGoogle } from 'react-icons/fc';
import { FaGhost, FaApple } from 'react-icons/fa';

import { isElectron, useAuth, useRouteNav, GetServerInfo, useUser } from '@sage3/frontend';

// Logos
import cilogonLogo from '../../../assets/cilogon.png';

/**
 * Login page with authentication options and board context handling
 */
export function LoginPage() {
  const { auth, googleLogin, appleLogin, ciLogin, guestLogin, spectatorLogin, loading: authLoading } = useAuth();
  const { user, loading: userLoading } = useUser();
  const { toHome } = useRouteNav();
  
  const [serverName, setServerName] = useState<string>('');
  const [shouldDisable, setShouldDisable] = useState(false);
  const [logins, setLogins] = useState<string[]>([]);
  
  const logoUrl = '/assets/sage3_banner.webp';
  const thisIsElectron = isElectron();

  /**
   * Gets returnTo URL from query parameters with validation
   */
  const getReturnToUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    
    // Validate returnTo URL to prevent open redirects
    if (returnTo) {
      if (returnTo.startsWith('/') && !returnTo.includes('://')) {
        return returnTo;
      }
    }
    return null;
  };

  /**
   * Retrieves and validates saved board context from localStorage
   */
  const getSavedBoardContext = () => {
    try {
      const savedContext = localStorage.getItem('sage3_pending_board');
      
      if (savedContext) {
        const context = JSON.parse(savedContext);
        
        // Check if context is not too old (24 hours)
        const isRecent = Date.now() - context.timestamp < 24 * 60 * 60 * 1000;
        
        if (isRecent && context.roomId && context.boardId) {
          return context;
        } else {
          // Remove old context
          localStorage.removeItem('sage3_pending_board');
        }
      }
    } catch (error) {
      console.warn('Error reading saved board context:', error);
      localStorage.removeItem('sage3_pending_board');
    }
    return null;
  };

  /**
   * Initializes page and retrieves server information
   */
  useEffect(() => {
    document.title = 'SAGE3 - Login';

    GetServerInfo().then((conf) => {
      if (conf.serverName) setServerName(conf.serverName);
      if (conf.logins) setLogins(conf.logins);
    });
  }, []);

  /**
   * Sends user back to Electron landing page
   */
  const goToLanding = () => {
    setShouldDisable(true);
    window.electron.send('load-landing');
  };

  /**
   * Opens client download page
   */
  const goToClientDownload = () => {
    window.open('https://sage3.sagecommons.org/', '_blank');
  };

  /**
   * Handles authentication state changes and redirects
   */
  const authNavCheck = useCallback(() => {
    if (auth) {
      // Only redirect if user has both auth AND account
      if (auth && user) {
        // Check for saved board context first
        const savedContext = getSavedBoardContext();
        if (savedContext) {
          localStorage.removeItem('sage3_pending_board');
          const redirectUrl = `/#/board/${savedContext.roomId}/${savedContext.boardId}`;
          window.location.href = redirectUrl;
          return;
        }

        // Fall back to returnTo URL parameter
        const returnTo = getReturnToUrl();
        if (returnTo) {
          const redirectUrl = `/#${returnTo}`;
          window.location.href = redirectUrl;
        } else {
          toHome();
        }
      } else if (auth && !user) {
        // User authenticated but no account - preserve context for AccountPage
      }
    }
  }, [auth, user]);

  useEffect(() => {
    authNavCheck();
  }, [authNavCheck]);

  const { colorMode } = useColorMode();

  return (
    <Box display="flex" flexDir={'column'} justifyContent="center" alignItems="center" width="100%" height="100%" position="relative">
      <Box pb={'2rem'} alignItems="center">
        <Image aspectRatio={2.55} width="20vw" minWidth="400px" maxWidth="35rem" src={logoUrl} alt="SAGE3 Logo" fit="contain" />
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

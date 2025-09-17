/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useCallback, useState } from 'react';

import { Button, ButtonGroup, IconButton, Box, useColorMode, Image, Text, VStack, useColorModeValue, useToast } from '@chakra-ui/react';

import { FcGoogle } from 'react-icons/fc';
import { FaGhost, FaApple } from 'react-icons/fa';

import { isElectron, useAuth, useRouteNav, GetServerInfo } from '@sage3/frontend';

// Logos
import cilogonLogo from '../../../assets/cilogon.png';

/**
 * Login page with authentication options and board context handling
 */
export function LoginPage() {
  const { auth, googleLogin, appleLogin, ciLogin, guestLogin, spectatorLogin, loading: authLoading } = useAuth();
  const { toCreateUser } = useRouteNav();
  const toast = useToast();
  
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
   * Retrieves and validates saved board context from localStorage with enhanced logging
   */
  const getSavedBoardContext = () => {
    try {
      const savedContext = localStorage.getItem('sage3_pending_board');
      
      if (savedContext) {
        const context = JSON.parse(savedContext);
        console.log('Board Context: Retrieved from localStorage:', context);
        
        // Check if context is not too old (24 hours)
        const isRecent = Date.now() - context.timestamp < 24 * 60 * 60 * 1000;
        const age = Date.now() - context.timestamp;
        
        if (isRecent && context.roomId && context.boardId) {
          console.log(`Board Context: Valid context found (age: ${Math.round(age / 1000)}s)`);
          return context;
        } else {
          // Remove old context
          console.log(`Board Context: Removing stale context (age: ${Math.round(age / 1000)}s, isRecent: ${isRecent})`);
          localStorage.removeItem('sage3_pending_board');
        }
      } else {
        console.log('Board Context: No saved context found');
      }
    } catch (error) {
      console.warn('Board Context: Error reading saved context:', error);
      localStorage.removeItem('sage3_pending_board');
    }
    return null;
  };

  /**
   * Preserves board context during authentication flows
   */
  const preserveBoardContext = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    
    // Check if returnTo contains board information
    if (returnTo && returnTo.includes('/board/')) {
      const boardMatch = returnTo.match(/\/board\/([^\/]+)\/([^\/]+)/);
      if (boardMatch) {
        const [, roomId, boardId] = boardMatch;
        const boardContext = {
          roomId,
          boardId,
          timestamp: Date.now(),
          url: window.location.href,
          source: 'login_returnTo'
        };
        
        try {
          localStorage.setItem('sage3_pending_board', JSON.stringify(boardContext));
          console.log('Board Context: Preserved from returnTo parameter:', boardContext);
        } catch (error) {
          console.warn('Board Context: Failed to preserve context:', error);
        }
      }
    }
  }, []);

  /**
   * Checks for OAuth authentication errors in URL parameters and shows user feedback
   */
  const checkAuthErrors = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const details = urlParams.get('details');

    if (error) {
      let title = 'Authentication Failed';
      let description = 'Please try again or contact support if the problem persists.';

      // Provide specific error messages based on error type
      switch (error) {
        case 'google_error':
          title = 'Google Login Failed';
          description = 'There was an error with Google authentication. Please try again.';
          break;
        case 'google_no_user':
          title = 'Google Login Issue';
          description = 'Google authentication succeeded but no user data was received. Please try again.';
          break;
        case 'google_login_failed':
          title = 'Google Session Error';
          description = 'Unable to create your session after Google login. Please try again.';
          break;
        case 'google_oauth_error':
          title = 'Google OAuth Error';
          description = 'Google returned an authentication error. Please try again.';
          break;
        case 'cilogon_error':
          title = 'CILogon Authentication Failed';
          description = 'There was an error with CILogon authentication. Please check your institution selection and try again.';
          break;
        case 'cilogon_no_user':
          title = 'CILogon Login Issue';
          description = 'CILogon authentication succeeded but no user data was received. Please try again or contact your institution.';
          break;
        case 'cilogon_login_failed':
          title = 'CILogon Session Error';
          description = 'Unable to create your session after CILogon authentication. Please try again.';
          break;
        case 'cilogon_oauth_error':
          title = 'CILogon OAuth Error';
          description = 'CILogon returned an authentication error. Please check your institution selection and try again.';
          break;
        case 'apple_error':
          title = 'Apple Login Failed';
          description = 'There was an error with Apple authentication. Please try again.';
          break;
        case 'apple_no_user':
          title = 'Apple Login Issue';
          description = 'Apple authentication succeeded but no user data was received. Please try again.';
          break;
        case 'apple_login_failed':
          title = 'Apple Session Error';
          description = 'Unable to create your session after Apple login. Please try again.';
          break;
        case 'apple_oauth_error':
          title = 'Apple OAuth Error';
          description = 'Apple returned an authentication error. Please try again.';
          break;
        default:
          title = 'Authentication Error';
          description = `Unknown authentication error: ${error}`;
      }

      // Add technical details if available (for debugging)
      if (details) {
        description += ` Technical details: ${decodeURIComponent(details)}`;
      }

      // Log to console for debugging (always visible)
      console.error(`OAuth Authentication Error [${error}]:`, {
        title,
        description,
        details: details ? decodeURIComponent(details) : 'No additional details',
        timestamp: new Date().toISOString()
      });

      // Show toast for user feedback (may be missed due to redirects)
      toast({
        title,
        description,
        status: 'error',
        duration: 8000,
        isClosable: true,
        position: 'top'
      });

      // Clear error parameters from URL to prevent showing the error again
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      newUrl.searchParams.delete('details');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [toast]);

  /**
   * Initializes page and retrieves server information
   */
  useEffect(() => {
    console.log('Login Page: Initializing');
    document.title = 'SAGE3 - Login';

    GetServerInfo().then((conf) => {
      console.log('Login Page: Server info received:', { serverName: conf.serverName, logins: conf.logins });
      if (conf.serverName) setServerName(conf.serverName);
      if (conf.logins) setLogins(conf.logins);
    });

    // Preserve board context from URL parameters before checking for errors
    preserveBoardContext();

    // Check for authentication errors on page load
    console.log('Login Page: Checking for auth errors in URL:', window.location.search);
    checkAuthErrors();
  }, [checkAuthErrors, preserveBoardContext]);

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
   * Handles authentication state changes - ONLY checks for auth, not user accounts
   */
  const authNavCheck = useCallback(() => {
    // Log authentication state for debugging
    console.log('Auth State Check:', {
      auth: auth ? { id: auth.id, provider: auth.provider, email: auth.email } : null,
      authLoading,
      timestamp: new Date().toISOString()
    });

    // Don't make decisions while still loading auth
    if (authLoading) {
      console.log('Auth Check: Still loading auth state, waiting...');
      return;
    }

    if (auth) {
      console.log('Auth Success: Authentication present, redirecting to account creation/validation');
      
      // Check for saved board context first to preserve it
      const savedContext = getSavedBoardContext();
      if (savedContext) {
        console.log('Auth Success: Found saved board context, preserving for account page');
        // Keep the context - don't remove it here, let account page handle it
      }

      // Check for returnTo URL parameter
      const returnTo = getReturnToUrl();
      if (returnTo) {
        console.log('Auth Success: Found returnTo parameter, passing to account creation');
        toCreateUser(returnTo);
      } else {
        console.log('Auth Success: No returnTo, going to account creation page');
        toCreateUser();
      }
    } else if (!auth && !authLoading) {
      console.log('Auth Check: No authentication present (normal unauthenticated state)');
    } else {
      console.log('Auth Check: Auth loading in progress');
    }
  }, [auth, authLoading, toCreateUser]);

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

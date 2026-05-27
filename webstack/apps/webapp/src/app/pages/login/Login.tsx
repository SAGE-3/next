/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useCallback, useState } from 'react';

import {
  Button, ButtonGroup, IconButton, Box, useColorMode, Image, Text, VStack, useToast,
  Input, FormControl, FormLabel, InputGroup, InputRightElement,
} from '@chakra-ui/react';

import { FcGoogle } from 'react-icons/fc';
import { FaGhost, FaApple, FaLock } from 'react-icons/fa';
import { SiKeycloak } from 'react-icons/si';
import { MdLogin } from 'react-icons/md';

import { isElectron, useAuth, useRouteNav, GetServerInfo } from '@sage3/frontend';

// Logos
import cilogonLogo from '../../../assets/cilogon.png';

/**
 * Login page with authentication options and board context handling
 */
export function LoginPage() {
  const { auth, googleLogin, appleLogin, ciLogin, keycloakLogin, guestLogin, spectatorLogin, localLogin, loading: authLoading } = useAuth();
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

        // Check if context is not too old (24 hours)
        const isRecent = Date.now() - context.timestamp < 24 * 60 * 60 * 1000;

        if (isRecent && context.roomId && context.boardId) {
          return context;
        } else {
          localStorage.removeItem('sage3_pending_board');
        }
      }
    } catch (error) {
      console.error('Board Context: Error reading saved context:', error);
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
          source: 'login_returnTo',
        };

        try {
          localStorage.setItem('sage3_pending_board', JSON.stringify(boardContext));
        } catch (error) {
          console.error('Board Context: Failed to preserve context:', error);
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
        case 'keycloak_error':
          title = 'Keycloak Login Failed';
          description = 'There was an error with Keycloak authentication. Please try again.';
          break;
        case 'keycloak_no_user':
          title = 'Keycloak Login Issue';
          description = 'Keycloak authentication succeeded but no user data was received. Please try again.';
          break;
        case 'keycloak_login_failed':
          title = 'Keycloak Session Error';
          description = 'Unable to create your session after Keycloak login. Please try again.';
          break;
        case 'keycloak_oauth_error':
          title = 'Keycloak OAuth Error';
          description = 'Keycloak returned an authentication error. Please try again.';
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
        timestamp: new Date().toISOString(),
      });

      // Show toast for user feedback (may be missed due to redirects)
      toast({
        title,
        description,
        status: 'error',
        duration: 8000,
        isClosable: true,
        position: 'top',
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
    document.title = 'SAGE3 - Login';

    GetServerInfo().then((conf) => {
      if (conf.serverName) setServerName(conf.serverName);
      if (conf.logins) setLogins(conf.logins);
    });

    preserveBoardContext();
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
    if (authLoading) return;

    if (auth) {
      // Preserve saved board context — let account page handle it
      getSavedBoardContext();

      const returnTo = getReturnToUrl();
      if (returnTo) {
        toCreateUser(returnTo);
      } else {
        toCreateUser();
      }
    }
  }, [auth, authLoading, toCreateUser]);

  useEffect(() => {
    authNavCheck();
  }, [authNavCheck]);

  const [ldapUsername, setLdapUsername] = useState('');
  const [ldapPassword, setLdapPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ldapLoading, setLdapLoading] = useState(false);

  const handleLdapLogin = async () => {
    if (!ldapUsername || !ldapPassword) return;
    setLdapLoading(true);
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/auth/ldap';
    const u = document.createElement('input');
    u.name = 'username';
    u.value = ldapUsername;
    const p = document.createElement('input');
    p.name = 'password';
    p.value = ldapPassword;
    form.appendChild(u);
    form.appendChild(p);
    document.body.appendChild(form);
    form.submit();
  };

  const { colorMode } = useColorMode();

  const isGoogle = !shouldDisable && logins.includes('google');
  const isApple = !shouldDisable && logins.includes('apple');
  const isCILogon = !shouldDisable && logins.includes('cilogon');
  const isKeycloak = !shouldDisable && logins.includes('keycloak');

  return (
    <Box display="flex" flexDir={'column'} justifyContent="center" alignItems="center" width="100%" height="100%" position="relative">
      <Box pb={'2rem'} alignItems="center">
        <Image
          aspectRatio={2.55}
          width="20vw"
          minWidth="400px"
          maxWidth="35rem"
          // width="300px"
          src={logoUrl}
          alt="SAGE3 Logo"
          fit="contain"
          // background={colorMode === 'light' ? 'gray.800' : 'undefined'}
          mixBlendMode={colorMode === 'light' ? 'difference' : 'normal'}
          filter={colorMode === 'light' ? 'hue-rotate(200deg)' : 'none'}
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
          {isGoogle && (
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
          )}

          {/* Apple Auth Service */}
          {isApple && (
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
          )}

          {/* CILogon Auth Service */}
          {isCILogon && (
            <ButtonGroup isAttached size="lg" width="100%">
              <IconButton
                width="80px"
                aria-label="Login with CILogon"
                icon={<Image w="36px" h="36px" src={cilogonLogo} alt="CILogon Logo" />}
                pointerEvents="none"
                borderRight={`3px solid`}
                borderColor={colorMode === 'light' ? 'gray.50' : 'gray.800'}
              />
              <Button width="100%" isDisabled={shouldDisable || !logins.includes('cilogon')} justifyContent="left" onClick={ciLogin}>
                Login with CILogon
              </Button>
            </ButtonGroup>
          )}

          {/* Keycloak Auth Service */}
          {isKeycloak && (
            <ButtonGroup isAttached size="lg" width="100%">
              <IconButton
                width="80px"
                aria-label="Login with Keycloak"
                icon={<SiKeycloak size="30" width="50px" />}
                pointerEvents="none"
                borderRight={`3px solid`}
                borderColor={colorMode === 'light' ? 'gray.50' : 'gray.800'}
              />
              <Button width="100%" isDisabled={shouldDisable || !logins.includes('keycloak')} justifyContent="left" onClick={keycloakLogin}>
                Login with Keycloak
              </Button>
            </ButtonGroup>
          )}

          {/* LDAP / Active Directory Login */}
          {logins.includes('ldap') && (
            <VStack spacing={2} width="100%">
              <FormControl>
                <FormLabel fontSize="sm">Username</FormLabel>
                <InputGroup>
                  <Input
                    placeholder="username"
                    value={ldapUsername}
                    onChange={(e) => setLdapUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLdapLogin()}
                    autoComplete="username"
                  />
                </InputGroup>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="password"
                    value={ldapPassword}
                    onChange={(e) => setLdapPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLdapLogin()}
                    autoComplete="current-password"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label="Show password"
                      icon={<FaLock />}
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              <ButtonGroup isAttached size="lg" width="100%">
                <IconButton
                  width="80px"
                  aria-label="Login with AD"
                  icon={<MdLogin size="26" />}
                  pointerEvents="none"
                  borderRight={`3px solid`}
                  borderColor={colorMode === 'light' ? 'gray.50' : 'gray.800'}
                />
                <Button
                  width="100%"
                  justifyContent="left"
                  isLoading={ldapLoading}
                  isDisabled={shouldDisable || !ldapUsername || !ldapPassword}
                  onClick={handleLdapLogin}
                >
                  Login with AD
                </Button>
              </ButtonGroup>
            </VStack>
          )}

          {/* Guest Auth Service */}
          {logins.includes('guest') && (
            <ButtonGroup isAttached size="lg" width="100%">
              <IconButton
                width="80px"
                aria-label="Login with Guest"
                icon={<FaGhost size="30" width="50px" />}
                pointerEvents="none"
                borderRight={`3px solid`}
                borderColor={colorMode === 'light' ? 'gray.50' : 'gray.800'}
              />
              <Button width="100%" isDisabled={shouldDisable} justifyContent="left" onClick={guestLogin}>
                Login as Guest
              </Button>
            </ButtonGroup>
          )}
        </VStack>
      </Box>
    </Box>
  );
}

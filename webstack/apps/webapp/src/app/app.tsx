/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// React
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, RouteProps, useParams } from 'react-router-dom';

// Chakra UI
import { Box, Button, ChakraProvider, CircularProgress, Text, useToast } from '@chakra-ui/react';

// SAGE3
import {
  theme,
  UserProvider,
  useUser,
  AuthProvider,
  useAuth,
  SocketAPI,
  useHexColor,
  useData,
  CursorBoardPositionProvider,
  apiUrls,
  UserSettingsProvider,
  YjsProvider,
  APIHttp,
} from '@sage3/frontend';
import { Board, OpenConfiguration } from '@sage3/shared/types';

// Pages
import { LoginPage, HomePage, BoardPage, AccountPage, AdminPage, OpenDesktopPage } from './pages';

/**
 * Checks URL connectivity with timeout
 */
async function checkURL(url: string, timeout: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, {
    signal: controller.signal,
  });
  clearTimeout(id);
  return response;
}

/**
 * Checks server connectivity
 */
async function checkServer(url: string) {
  try {
    const response = await checkURL(url, 2000);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Main application component with routing and connection handling
 */
export function App() {
  const status = useConnectStatus();
  const color = useHexColor('red');

  // Auto-reconnect logic
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (status) {
      if (interval) {
        clearInterval(interval);
      }
    } else {
      interval = setInterval(() => {
        checkServer(window.location.origin).then((status) => {
          if (status) {
            window.location.reload();
          }
        });
      }, 5000);
    }
  }, [status]);

  return (
    <Box position="relative" width="100vw" height="100svh">
      <ChakraProvider theme={theme}>
        <UserSettingsProvider>
          <AuthProvider>
            <UserProvider>
              {status ? (
                <Routes>
                  <Route path="/" element={<LoginPage />} />
                  <Route path="/login" element={<LoginPage />} />

                  <Route path="/enter/:roomId/:boardId" element={<OpenDesktopPage />} />

                  <Route
                    path="/createuser"
                    element={
                      <ProtectedAuthRoute>
                        <AccountPage />
                      </ProtectedAuthRoute>
                    }
                  />
                  <Route
                    path="/home/room/:roomId"
                    element={
                      <ProtectedAuthRoute>
                        <ProtectedUserRoute>
                          <HomePage />
                        </ProtectedUserRoute>
                      </ProtectedAuthRoute>
                    }
                  />
                  <Route
                    path="/home/:quickAccess"
                    element={
                      <ProtectedAuthRoute>
                        <ProtectedUserRoute>
                          <HomePage />
                        </ProtectedUserRoute>
                      </ProtectedAuthRoute>
                    }
                  />
                  <Route
                    path="/home"
                    element={
                      <ProtectedAuthRoute>
                        <ProtectedUserRoute>
                          <HomePage />
                        </ProtectedUserRoute>
                      </ProtectedAuthRoute>
                    }
                  />

                  <Route
                    path="/admin"
                    element={
                      <ProtectedAuthRoute>
                        <ProtectedAdminRoute>
                          <AdminPage />
                        </ProtectedAdminRoute>
                      </ProtectedAuthRoute>
                    }
                  />

                  <Route
                    path="/board/:roomId/:boardId"
                    element={
                      <ProtectedAuthRoute>
                        <ProtectedUserRoute>
                          <CheckBoardExistsRoute>
                            <CursorBoardPositionProvider>
                              <YjsProvider>
                                <BoardPage />
                              </YjsProvider>
                            </CursorBoardPositionProvider>
                          </CheckBoardExistsRoute>
                        </ProtectedUserRoute>
                      </ProtectedAuthRoute>
                    }
                  />

                  {/* Catch-all route for invalid URLs */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              ) : (
                <Box display="flex" flexDir="column" alignItems="center" textAlign={'center'} justifyContent="center" height="100%">
                  <Box width="100%" maxWidth="1200px">
                    <Text fontSize="7xl" pb="0">
                      SAGE3
                    </Text>

                    <Text fontSize="3xl" color={color} mb="5">
                      Lost connection to server.
                    </Text>
                    <Button onClick={() => window.location.reload()} colorScheme="green" size="lg">
                      Try to reconnect
                    </Button>
                  </Box>
                </Box>
              )}
            </UserProvider>
          </AuthProvider>
        </UserSettingsProvider>
      </ChakraProvider>
    </Box>
  );
}

export default App;

/**
 * Route protection for authenticated users
 */
export const ProtectedAuthRoute = (props: RouteProps): JSX.Element => {
  const { auth, loading } = useAuth();
  if (loading) {
    return LoadingSpinner();
  } else {
    return auth ? <> {props.children}</> : <Navigate to="/" replace />;
  }
};

/**
 * Route protection for users with accounts
 */
export const ProtectedUserRoute = (props: RouteProps): JSX.Element => {
  const { user, loading } = useUser();
  if (loading) {
    return <div>Loading...</div>;
  } else {
    return user ? <> {props.children}</> : <Navigate to="/createuser" replace />;
  }
};

/**
 * Route protection for admin users
 */
export const ProtectedAdminRoute = (props: RouteProps): JSX.Element => {
  const { user, loading } = useUser();
  const { auth } = useAuth();
  const data = useData(apiUrls.config.getConfig);

  const isSignedInUser = user?.data.userRole === 'user' || user?.data.userRole === 'admin';

  if (!user || loading || !data) {
    return LoadingSpinner();
  } else {
    const config = data as OpenConfiguration;
    // In dev mode, everyone can access admin routes
    if (!config.production) {
      return <> {props.children}</>;
    } else {
      // In production, check user role and admin list
      return isSignedInUser && config.admins.includes(user?.data.email) ? <> {props.children}</> : <Navigate to="/#/home" replace />;
    }
  }
};

/**
 * Checks WebSocket connection status
 */
const useConnectStatus = () => {
  const [connected, setConnection] = useState(true);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  useEffect(() => {
    async function setup() {
      const socket = await SocketAPI.getSocket();
      setSocket(socket);
    }
    setup();
  }, []);

  useEffect(() => {
    function disconnected() {
      setConnection(false);
    }
    if (socket) {
      socket.addEventListener('close', disconnected);
    }
    return () => {
      if (socket) {
        socket.removeEventListener('close', disconnected);
      }
    };
  }, [socket]);
  
  return connected;
};

/**
 * Route component that verifies board exists before rendering
 */
export const CheckBoardExistsRoute = (props: RouteProps): JSX.Element => {
  const { boardId, roomId } = useParams();
  const [status, setStatus] = useState<'pending' | 'exists' | 'not-exists'>('pending');
  const toast = useToast();

  useEffect(() => {
    async function checkBoard() {
      const response = await APIHttp.GET<Board>(`/boards/${boardId}`);
      if (response.success) {
        setStatus('exists');
      } else {
        setStatus('not-exists');
        toast({
          title: 'Board does not exist',
          description: 'The board you are trying to access does not exist.',
          status: 'error',
          duration: 9000,
          isClosable: true,
        });
      }
    }
    checkBoard();
  }, []);

  if (status === 'pending') {
    return LoadingSpinner();
  } else {
    return status === 'exists' ? <>{props.children}</> : <Navigate to="/home" replace />;
  }
};

/**
 * Loading spinner component
 */
export const LoadingSpinner = () => {
  const teal = useHexColor('teal');
  return (
    <Box width="100vw" height="100vh" display="flex" justifyContent={'center'} alignItems={'center'}>
      <CircularProgress isIndeterminate size={'xl'} color={teal} />
    </Box>
  );
};
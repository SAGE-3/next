/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, RouteProps } from 'react-router-dom';

import { Box, Button, ChakraProvider, Text } from '@chakra-ui/react';
import {
  PresenceProvider,
  theme,
  UserProvider,
  useUser,
  AuthProvider,
  useAuth,
  CheckUrlForBoardId,
  SocketAPI,
  useHexColor,
  useData,
} from '@sage3/frontend';

import { serverConfiguration } from '@sage3/frontend';

import { LoginPage } from './pages/Login';
import { HomePage } from './pages/Home';
import { BoardPage } from './pages/Board';
import { AccountPage } from './pages/Account';
import { AdminPage } from './pages/Admin';

/**
 * Main application component
 *
 * @export
 * @returns
 */
export function App() {
  const status = useConnectStatus();
  const color = useHexColor('red');

  // Try to reconnect to the server
  useEffect(() => {
    let interval;
    if (status) {
      if (interval) {
        clearInterval(interval);
      }
    } else {
      interval = setInterval(() => {
        window.location.reload()
      }, 4000);
    }
  }, [status]);


  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <UserProvider>
          <PresenceProvider>
            {status ? (
              <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/enter/:roomId/:boardId" element={<CheckUrlForBoardId />} />

                <Route
                  path="/createuser"
                  element={
                    <ProtectedAuthRoute>
                      <AccountPage />
                    </ProtectedAuthRoute>
                  }
                />
                <Route
                  path="/home/:roomId"
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
                        <BoardPage />
                      </ProtectedUserRoute>
                    </ProtectedAuthRoute>
                  }
                />
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
          </PresenceProvider>
        </UserProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;

/**
 * Private route for authenticated users
 * @param props RouteProps
 * @returns JSX.React.ReactNode
 */
export const ProtectedAuthRoute = (props: RouteProps): JSX.Element => {
  const { auth, loading } = useAuth();
  if (loading) {
    return <div>Loading...</div>;
  } else {
    return auth ? <> {props.children}</> : <Navigate to="/" replace />;
  }
};

/**
 * Private route for authenticated users and user account created
 * @param props RouteProps
 * @returns JSX.React.ReactNode
 */
export const ProtectedUserRoute = (props: RouteProps): JSX.Element => {
  const { user, loading } = useUser();
  if (loading) {
    return <div>Loading...</div>;
  } else {
    return user ? <> {props.children}</> : <Navigate to="/createuser" replace />;
  }
};

export const ProtectedAdminRoute = (props: RouteProps): JSX.Element => {
  const { user, loading } = useUser();
  const { auth } = useAuth();
  const data = useData('/api/configuration');

  if (!user || loading || !data) {
    return <div>Loading...</div>;
  } else {
    const config = data as serverConfiguration;
    // in dev mode, everybody can access the route
    if (!config.production) {
      return <> {props.children}</>;
    } else {
      // in production, checking that the user is logged with google and in the list
      return (auth?.provider === "google" && config.admins.includes(user?.data.email)) ? <> {props.children}</> : <Navigate to="/#/home" replace />;
    }
  }
};


// Check the connection status using the API socket.
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
      console.log('connection issues');
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

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { ChakraProvider, Spinner } from '@chakra-ui/react';

import { PageLayout, theme } from '@sage3/frontend/components';
import { PanZoomProvider, UserProvider, UsersProvider, useUser } from '@sage3/frontend/services';

import { Board, Home, Login, Info } from './pages';
// import { Admin } from './pages';

import { useAutoPlayHelper } from './hooks/useAutoPlayHelper';
import { RouteProps } from 'react-router';

import { SocketProvider } from '@sage3/frontend/utils/misc/socket';

/**
 * Main SAGE3 page
 * @returns JSX.Element
 */
export const App: React.FC = () => {
  useAutoPlayHelper();

  return (
    <ChakraProvider theme={theme}>
      <HashRouter>
        <Suspense
          fallback={<PageLayout title={<Spinner thickness="4px" speed="0.65s" emptyColor="gray.400" color="teal.300" size="md" />} />}
        >
          {/* <SocketProvider>
            <UserProvider>
              <UsersProvider>
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route
                    path="/home"
                    element={
                      <PrivateRoute>
                        <Home />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/info"
                    element={
                      <PrivateRoute>
                        <Info />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="board/:boardId"
                    element={
                      <PrivateRoute>
                        <React.Suspense fallback={'Loading...'}>
                          <PanZoomProvider>
                            <Board />
                          </PanZoomProvider>
                        </React.Suspense>
                      </PrivateRoute>
                    }
                  />
                </Routes>
              </UsersProvider>
            </UserProvider>
          </SocketProvider> */}
        </Suspense>
      </HashRouter>
    </ChakraProvider>
  );
};

/**
 * Private route for authenticated users
 * @param props RouteProps
 * @returns JSX.React.ReactNode
 */
export const PrivateRoute = (props: RouteProps): JSX.Element => {
  const user = useUser();
  return user.isAuthenticated ? <>{props.children}</> : <Navigate to="/" />;
};

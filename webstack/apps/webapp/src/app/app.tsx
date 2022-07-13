/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Suspense } from 'react';
import { Routes, Route, Navigate, RouteProps } from 'react-router-dom';

import { ChakraProvider } from '@chakra-ui/react';
import {
  PresenceProvider, theme, UserProvider,
  useUser, AuthProvider, useAuth
} from '@sage3/frontend';

import { LoginPage } from './pages/Login';
import { HomePage } from './pages/Home';
import { BoardPage } from './pages/Board';
import { AccountPage } from './pages/Account';

/**
 * Main application component
 *
 * @export
 * @returns
 */
export function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <UserProvider>
          <PresenceProvider>
            <Suspense fallback={<div>An issue has occured.</div>}>

              <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/login" element={<LoginPage />} />

                <Route
                  path="/createuser"
                  element={
                    <ProtectedAuthRoute>
                      <AccountPage />
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
                  path="/board"
                  element={
                    <ProtectedAuthRoute>
                      <ProtectedUserRoute>
                        <BoardPage />
                      </ProtectedUserRoute>
                    </ProtectedAuthRoute>
                  }
                />
              </Routes>
            </Suspense>
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
  const { auth } = useAuth();
  return auth ? <> {props.children}</> : <Navigate to="/" replace />;
};

/**
 * Private route for authenticated users and user account created
 * @param props RouteProps
 * @returns JSX.React.ReactNode
 */
export const ProtectedUserRoute = (props: RouteProps): JSX.Element => {
  const { user } = useUser();
  return user ? <> {props.children}</> : <Navigate to="/createuser" replace />;
};

import { Suspense } from 'react';
import { Routes, Route, Navigate, RouteProps } from 'react-router-dom';

import { ChakraProvider } from '@chakra-ui/react';
import { SocketAPI, theme, UserProvider, useUser } from '@sage3/frontend';

import { LoginPage } from './pages/Login';
import { HomePage } from './pages/Home';
import { AuthProvider, useAuth } from '@sage3/frontend';
import { BoardPage } from './pages/Board';
import { AccountPage } from './pages/Account';

export function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <UserProvider>
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
  const auth = useAuth();
  SocketAPI.init()
  return auth.isAuthenticated ? <> {props.children}</> : <Navigate to="/" replace />;
};

/**
 * Private route for authenticated users and user account created
 * @param props RouteProps
 * @returns JSX.React.ReactNode
 */
export const ProtectedUserRoute = (props: RouteProps): JSX.Element => {
  const { user } = useUser();
  console.log(user)
  return user ? <> {props.children}</> : <Navigate to="/createuser" replace />;
};

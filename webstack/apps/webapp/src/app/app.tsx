import { Suspense } from 'react';
import { Routes, Route, Navigate, RouteProps } from 'react-router-dom';

import { ChakraProvider } from '@chakra-ui/react';
import { theme } from '@sage3/frontend';

import { LoginPage } from './pages/Login';
import { HomePage } from './pages/Home';
import { AuthProvider, useAuth } from '@sage3/frontend';
import { BoardPage } from './pages/Board';

export function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Suspense fallback={<div>An issue has occured.</div>}>

          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/board"
              element={
                <ProtectedRoute>
                  <BoardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
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
export const ProtectedRoute = (props: RouteProps): JSX.Element => {
  const user = useAuth();
  return user.isAuthenticated ? <> {props.children}</> : <Navigate to="/" replace />;
};

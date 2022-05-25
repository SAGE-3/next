import { Suspense } from 'react';
import { Routes, Route, Navigate, RouteProps } from 'react-router-dom';

import { ChakraProvider } from '@chakra-ui/react';
import { theme } from '@sage3/frontend';

import { LoginPage } from './pages/Login';
import { HomePage } from './pages/Home';
import { AuthProvider, useAuth } from '@sage3/frontend';

export function App() {
  return (
    <ChakraProvider theme={theme}>
      <Suspense fallback={<div>An issue has occured.</div>}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LoginPage />} />

            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <HomePage />
                </PrivateRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </Suspense>
    </ChakraProvider>
  );
}

export default App;

/**
 * Private route for authenticated users
 * @param props RouteProps
 * @returns JSX.React.ReactNode
 */
export const PrivateRoute = (props: RouteProps): JSX.Element => {
  const user = useAuth();
  return user.isAuthenticated ? <> {props.children}</> : <Navigate to="/" />;
};

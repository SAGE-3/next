/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * User Provider
 * @file User Provider
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

import { AuthHTTPService } from '../api';

type AuthenticatedType = {
  isAuthenticated: boolean;
};

const AuthContext = createContext({
  isAuthenticated: false,
} as AuthenticatedType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const [auth, setAuth] = useState<{ isAuthenticated: boolean }>({ isAuthenticated: false })

  useEffect(() => {
    async function fetchAuth() {
      const auth = await AuthHTTPService.verifyAuth();
      setAuth({ isAuthenticated: auth.authentication })
    }
    fetchAuth()
  }, [])
  return (
    <AuthContext.Provider
<<<<<<< HEAD
      value={auth}
=======
      value={
        isFulfilled && !isRejected
          ? {
              isAuthenticated: true,
            }
          : {
              isAuthenticated: false,
            }
      }
>>>>>>> dev-server
    >
      {props.children}
    </AuthContext.Provider>
  );
}

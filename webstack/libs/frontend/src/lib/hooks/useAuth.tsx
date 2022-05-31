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

import React, { createContext, useContext } from 'react';
import { useAsync } from 'react-async';

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
const authPromise = AuthHTTPService.verifyAuth();

export function AuthProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const { isFulfilled, isRejected, isPending } = useAsync({
    promise: authPromise,
    initialValue: null,
    suspense: true,
  });

  return (
    <AuthContext.Provider
      value={
        isFulfilled && !isRejected
          ? {
              isAuthenticated: true,
            }
          : {
              isAuthenticated: false,
            }
      }
    >
      {props.children}
    </AuthContext.Provider>
  );
}

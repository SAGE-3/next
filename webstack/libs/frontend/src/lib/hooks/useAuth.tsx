/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Auth Provider
 * @file User Provider
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SBAuthSchema } from '@sage3/sagebase';

/**
 * Endpoint to login with Google OAuth
 */
function googleLogin(): void {
  // return to host with the same protocol (http/https)
  window.location.replace(`${window.location.protocol}//${window.location.host}/auth/google`);
}

/**
 * Endpoint to login with CILogon
 */
function ciLogin(): void {
  // return to host with the same protocol (http/https)
  window.location.replace(`${window.location.protocol}//${window.location.host}/auth/cilogon`);
}

/**
 * Endpoint to login with Guest
 */
async function guestLogin(): Promise<void> {
  const res = await fetch('/auth/guest', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username: 'guest-username', password: 'guest-pass' }),
  });
  if (res.status === 200) {
    window.location.reload();
  }
}

/**
 * Logout the user out of the current session and user
 */
async function logout(): Promise<void> {
  const res = await fetch('/auth/logout', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 200) {
    // return to homepage
    window.location.replace('/');
  }
}

/**
 * Verify the authentication of the current user.
 * @returns {boolean} returns true if the user if authenticated
 */
async function verify(): Promise<{ success: boolean; authentication: boolean; auth: SBAuthSchema | null }> {
  const res = await fetch('/auth/verify', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return { success: false, authentication: false, auth: null };
  return res.json();
}

type AuthenticatedType = {
  auth: SBAuthSchema | null;
  loading: boolean;
  verify: () => Promise<{ success: boolean; authentication: boolean; auth: SBAuthSchema | null }>;
  logout: () => Promise<void>;
  googleLogin: () => void;
  ciLogin: () => void;
  guestLogin: () => Promise<void>;
};

const AuthContext = createContext({
  auth: null,
} as AuthenticatedType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const [auth, setAuth] = useState<AuthenticatedType>({ auth: null, loading: true, verify, logout, googleLogin, ciLogin, guestLogin });

  useEffect(() => {
    async function fetchAuth() {
      const verifyRes = await verify();
      if (verifyRes.auth) {
        setAuth({ auth: verifyRes.auth, loading: false, verify, logout, googleLogin, ciLogin, guestLogin });
      } else {
        setAuth({ auth: null, verify, loading: false, logout, googleLogin, ciLogin, guestLogin });
      }
    }

    fetchAuth();
  }, []);

  return <AuthContext.Provider value={auth}>{props.children}</AuthContext.Provider>;
}

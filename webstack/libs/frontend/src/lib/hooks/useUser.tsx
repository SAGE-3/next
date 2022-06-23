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

import { User, UserSchema } from '@sage3/shared/types';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { APIHttp, SocketAPI } from '../api';
import { useAuth } from './useAuth';

const UserContext = createContext({ user: undefined as User | undefined, update: null as ((updates: Partial<UserSchema>) => Promise<void>) | null });

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const auth = useAuth();
  const [user, setUser] = useState<User | undefined>(undefined)
  useEffect(() => {
    let userSub: (() => void) | null = null;
    async function fetchUser() {

      const userResponse = await APIHttp.GET<UserSchema, User>(`/users/${auth.auth?.id}`);
      console.log(userResponse)
      if (userResponse.data) {
        setUser(userResponse.data[0])
        const route = `/users/${userResponse.data[0]._id}`;

        userSub = await SocketAPI.subscribe<UserSchema>(route, (message) => {
          const doc = message.doc as User;
          switch (message.type) {
            case 'CREATE': {
              setUser(doc)
              break;
            }
            case 'UPDATE': {
              setUser(doc)
              break;
            }
            case 'DELETE': {
              setUser(undefined)
            }
          }
        });
      } else {
        setUser(undefined)
      }

    }

    if (auth.isAuthenticated) {
      fetchUser()
    }
    return () => {
      if (userSub) {
        userSub();
      }
    }
  }, [auth])

  async function update(updates: Partial<UserSchema>): Promise<void> {
    if (user) {
      const response = await APIHttp.PUT<UserSchema>(`/users/${user._id}`, updates);
      return;
    }
    return;
  }

  return (
    <UserContext.Provider value={{ user, update }}>
      {props.children}
    </UserContext.Provider>
  );
}

/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * User Provider
 * @file User Provider
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { User, UserSchema } from '@sage3/shared/types';
import { genId, SAGE3Ability } from '@sage3/shared';

import { APIHttp, SocketAPI } from '../api';
import { useAuth } from './useAuth';

const UserContext = createContext({
  user: undefined as User | undefined,
  loading: true,
  exists: false,
  accessId: '',
  update: null as ((updates: Partial<UserSchema>) => Promise<void>) | null,
  create: null as ((user: UserSchema) => Promise<void>) | null,
});

export function useUser() {
  return useContext(UserContext);
}

function setAbilityUser(user: User) {
  SAGE3Ability.setUser(user);
}

export function UserProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const { auth } = useAuth();
  const [user, setUser] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [accessId, setAccessId] = useState(genId());

  const fetchUser = useCallback(async () => {
    if (auth) {
      const userResponse = await APIHttp.GET<User>(`/users/${auth.id}`);
      if (userResponse.data) {
        const user = userResponse.data[0];
        setUser(user);
        setAbilityUser(user);
        setExists(true);
      } else {
        setUser(undefined);
        setLoading(false);
        setExists(false);
      }
    } else {
      setUser(undefined);
      setLoading(false);
      setExists(false);
    }
  }, [auth]);

  useEffect(() => {
    fetchUser();
  }, [auth, fetchUser]);

  useEffect(() => {
    if (!auth) return;
    let userSub: (() => void) | null = null;
    async function SubtoUser() {
      // Subscribe to user updates since user might login from multiple locations
      const route = `/users/${auth?.id}`;
      // Socket Listenting to updates from server about the current board
      userSub = await SocketAPI.subscribe<User>(route, (message) => {
        const user = message.doc as User[];
        setUser(user[0]);
      });
    }
    SubtoUser();
    return () => {
      if (userSub) {
        userSub();
      }
    };
  }, [auth]);

  /**
   * Create a new user account
   * @param user User to create
   */
  const create = useCallback(
    async (user: UserSchema): Promise<void> => {
      if (auth) {
        const userResponse = await APIHttp.POST<User>('/users/create', user);
        if (userResponse.data) {
          setUser(userResponse.data[0]);
          setExists(true);
        }
      }
    },
    [auth]
  );

  /**
   * Update the current user
   * @param updates Updates to apply to the user
   * @returns
   */
  const update = useCallback(
    async (updates: Partial<UserSchema>): Promise<void> => {
      if (user) {
        const response = await APIHttp.PUT<User>(`/users/${user._id}`, updates);
        if (response.success && response.data) {
          setUser(response.data[0]);
        }
        return;
      }
      return;
    },
    [user]
  );

  return <UserContext.Provider value={{ user, loading, exists, update, create, accessId }}>{props.children}</UserContext.Provider>;
}

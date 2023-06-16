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

import { User, UserSchema } from '@sage3/shared/types';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { APIHttp } from '../api';
import { useAuth } from './useAuth';

const UserContext = createContext({
  user: undefined as User | undefined,
  loading: true,
  exists: false,
  update: null as ((updates: Partial<UserSchema>) => Promise<void>) | null,
  create: null as ((user: UserSchema) => Promise<void>) | null,
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const { auth } = useAuth();
  const [user, setUser] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);

  const fetchUser = useCallback(async () => {
    if (auth) {
      const userResponse = await APIHttp.GET<User>(`/users/${auth.id}`);
      if (userResponse.data) {
        setUser(userResponse.data[0]);
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

  return <UserContext.Provider value={{ user, loading, exists, update, create }}>{props.children}</UserContext.Provider>;
}

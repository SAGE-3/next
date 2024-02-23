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

// Number of boards to keep in recent boards list
const MAX_RECENT_BOARDS = 10;

const UserContext = createContext({
  user: undefined as User | undefined,
  loading: true,
  accessId: '',
  update: null as ((updates: Partial<UserSchema>) => Promise<void>) | null,
  create: null as ((user: UserSchema) => Promise<void>) | null,
  saveBoard: null as ((roomId: string) => void) | null,
  removeBoard: null as ((roomId: string) => void) | null,
  recentBoardAdd: null as ((boardId: string) => void) | null,
  clearRecentBoards: null as (() => void) | null,
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
  const [accessId, setAccessId] = useState(genId());

  const fetchUser = useCallback(async () => {
    if (auth) {
      const userResponse = await APIHttp.GET<User>(`/users/${auth.id}`);
      if (userResponse.data) {
        const user = userResponse.data[0];
        // Check for savedBoards
        if (!user.data.savedBoards) {
          APIHttp.PUT<User>(`/users/${user._id}`, {
            savedBoards: [],
          });
        }
        // Check for recentBoards
        if (!user.data.recentBoards) {
          APIHttp.PUT<User>(`/users/${user._id}`, {
            recentBoards: [],
          });
        }
        setAbilityUser(user);
        setUser(user);
      } else {
        setUser(undefined);
        setLoading(false);
      }
    } else {
      setUser(undefined);
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    fetchUser();
  }, [auth, fetchUser]);

  useEffect(() => {
    if (!user) return;
    let userSub: (() => void) | null = null;
    async function SubtoUser() {
      // Subscribe to user updates since user might login from multiple locations
      const route = `/users/${auth?.id}`;
      // Socket Listenting to updates from server about the current board
      userSub = await SocketAPI.subscribe<User>(route, (message) => {
        const user = message.doc as User[];
        setAbilityUser(user[0]);
        setUser(user[0]);
      });
    }
    SubtoUser();
    return () => {
      if (userSub) {
        userSub();
      }
    };
  }, [user]);

  /**
   * Create a new user account
   * @param user User to create
   */
  const create = useCallback(
    async (user: UserSchema): Promise<void> => {
      if (auth) {
        const userResponse = await APIHttp.POST<User>('/users/create', user);
        if (userResponse.data) {
          setAbilityUser(userResponse.data[0]);
          setUser(userResponse.data[0]);
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
          setAbilityUser(response.data[0]);
          setUser(response.data[0]);
        }
        return;
      }
      return;
    },
    [user]
  );

  /**
   * Save a board to the user's saved boards
   * @param boardId Room to save
   */
  const saveBoard = (boardId: string) => {
    if (!user) return;
    const currentBoards = user?.data.savedBoards || [];
    update({ savedBoards: [...currentBoards, boardId] });
  };

  /**
   * Remove a board from the user's saved boards
   * @param boardId Room to remove
   */
  const removeBoard = (boardId: string) => {
    if (!user) return;
    const currentBoards = user?.data.savedBoards || [];
    update({ savedBoards: currentBoards.filter((id) => id !== boardId) });
  };

  /**
   * Add a board to the user's recent boards
   * @param boardId Board to add
   */
  const recentBoardAdd = (boardId: string) => {
    if (!user) return;
    let currentBoards = user?.data.recentBoards || [];
    // Add new board
    currentBoards = [boardId, ...currentBoards];
    // Remove Dupicates
    currentBoards = Array.from(new Set(currentBoards));
    // Limit to MAX_RECENT_BOARDS recent boards
    currentBoards = currentBoards.slice(0, MAX_RECENT_BOARDS);
    update({ recentBoards: currentBoards });
  };
  /**
   * Clear the user's recent boards
   */
  const clearRecentBoards = () => {
    if (!user) return;
    update({ recentBoards: [] });
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        update,
        create,
        accessId,
        saveBoard,
        removeBoard,
        recentBoardAdd,
        clearRecentBoards,
      }}
    >
      {props.children}
    </UserContext.Provider>
  );
}

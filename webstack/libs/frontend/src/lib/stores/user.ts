/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Zustand
import { create } from 'zustand';
// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

// Application specific schema
import { User } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

import { APIHttp, SocketAPI } from '../api';

type UserStats = {
  userId: string;
  numRooms: number;
  numBoards: number;
  numApps: number;
  numAssets: number;
  numPlugins: number;
};

interface UserState {
  users: User[];
  error: string | null;
  getUserStats: (userId: string) => Promise<UserStats | null>;
  accountDeletion: (id: string) => Promise<boolean>;
  clearError: () => void;
  get: (id: string) => Promise<User | null>;
  subscribeToUsers: () => Promise<void>;
}

/**
 * The UserStore of others users.
 * The current user is a hook 'useUser'.
 */
const UsersStore = create<UserState>()((set, get) => {
  let usersSub: (() => void) | null = null;
  return {
    users: [],
    error: null,
    getUserStats: async (userId: string) => {
      const res = await fetch('/api/users/userStats', {
        body: JSON.stringify({ userId }),
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      const jsonResponse = await res.json();
      if (jsonResponse.success) {
        const data = jsonResponse.data as any;
        return data.userStats as UserStats;
      } else {
        set({ error: jsonResponse.message });
        return null;
      }
    },
    accountDeletion: async (id: string) => {
      // POST Request to delete the user
      const res = await fetch('/api/users/accountDeletion', {
        body: JSON.stringify({ id }),
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      const jsonResponse = await res.json();
      if (jsonResponse.success) {
        return true;
      } else {
        set({ error: jsonResponse.message });
        return false;
      }
    },
    clearError: () => {
      set({ error: null });
    },
    get: async (id: string) => {
      if (!SAGE3Ability.canCurrentUser('read', 'users')) return null;
      const user = get().users.find((user) => user._id === id);
      if (user) {
        return user;
      } else {
        const response = await APIHttp.GET<User>('/users/' + id);
        if (response.success && response.data) {
          const user = response.data[0] as User;
          set({ users: [...get().users, user] });
          return user;
        } else {
          set({ error: response.message });
          return null;
        }
      }
    },

    subscribeToUsers: async () => {
      if (!SAGE3Ability.canCurrentUser('read', 'users')) return;
      const response = await APIHttp.GET<User>('/users');
      if (response.success) {
        set({ users: response.data });
      } else {
        set({ error: response.message });
        return;
      }
      // Unsubscribe old subscription
      if (usersSub) {
        usersSub();
        usersSub = null;
      }

      // Socket Subscribe Message
      const route = '/users';
      // Socket Listenting to updates from server about the current users
      usersSub = await SocketAPI.subscribe<User>(route, (message) => {
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc as User[];
            set({ users: [...get().users, ...docs] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc as User[];
            const users = [...get().users];
            docs.forEach((doc) => {
              const idx = users.findIndex((el) => el._id === doc._id);
              if (idx > -1) {
                users[idx] = doc;
              }
            });
            set({ users });
            break;
          }
          case 'DELETE': {
            const docs = message.doc as User[];
            const ids = docs.map((d) => d._id);
            const users = [...get().users];
            const remainingUsers = users.filter((a) => !ids.includes(a._id));
            set({ users: remainingUsers });
          }
        }
      });
    },
  };
});

// Export the Zustand store
export const useUsersStore = UsersStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('UsersStore', useUsersStore);

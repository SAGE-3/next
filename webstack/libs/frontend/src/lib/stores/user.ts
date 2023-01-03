/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// The JS version of Zustand
import createVanilla from 'zustand/vanilla';

// The React Version of Zustand
import createReact from 'zustand';

// Application specific schema
import { User, UserSchema } from '@sage3/shared/types';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';
import { APIHttp, SocketAPI } from '../api';

interface UserState {
  users: User[];
  error: string | null;
  clearError: () => void;
  get: (id: string) => Promise<User | null>;
  subscribeToUsers: () => Promise<void>;
}

/**
 * The UserStore of others users.
 * The current user is a hook 'useUser'.
 */
const UsersStore = createVanilla<UserState>((set, get) => {
  let usersSub: (() => void) | null = null;
  return {
    users: [],
    error: null,
    clearError: () => {
      set({ error: null });
    },
    get: async (id: string) => {
      const user = get().users.find((user) => user._id === id);
      if (user) {
        return user;
      } else {
        const response = await APIHttp.GET<UserSchema, User>('/users/' + id);
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
      const response = await APIHttp.GET<UserSchema, User>('/users');
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
      usersSub = await SocketAPI.subscribe<UserSchema>(route, (message) => {
        const doc = message.doc as User;
        switch (message.type) {
          case 'CREATE': {
            set({ users: [...get().users, doc] });
            break;
          }
          case 'UPDATE': {
            const users = [...get().users];
            const idx = users.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              users[idx] = doc;
            }
            set({ users: users });
            break;
          }
          case 'DELETE': {
            const users = [...get().users];
            const idx = users.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              users.splice(idx, 1);
            }
            set({ users: users });
          }
        }
      });
    },
  };
});

// Convert the Zustand JS store to Zustand React Store
export const useUsersStore = createReact(UsersStore);

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('UsersStore', useUsersStore);

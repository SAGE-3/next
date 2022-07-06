/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// The JS version of Zustand
import createVanilla from 'zustand/vanilla';

// The React Version of Zustand
import createReact from 'zustand';

// Application specific schema
import { User, UserSchema } from '@sage3/shared/types';

interface UserState {
  user: User | undefined;
  create: (newuser: UserSchema) => Promise<void>;
  update: (updates: Partial<UserSchema>) => Promise<void>;
  subscribeToUser: (id: string) => Promise<void>;
}

/**
 * TODO
 * The UserStore of others users.
 * The current user is a hook useUser.
 */
const UserStore = createVanilla<UserState>((set, get) => {
  return {
    user: undefined,
    create: async (newuser: UserSchema) => {
      // TODO
    },
    update: async (updates: Partial<UserSchema>) => {
      // TODO
    },
    subscribeToUser: async (id: string) => {
      // TODO
    },
  };
});

// Convert the Zustand JS store to Zustand React Store
export const useUserStore = createReact(UserStore);

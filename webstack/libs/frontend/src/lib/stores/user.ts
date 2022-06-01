/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// The JS version of Zustand
import createVanilla from "zustand/vanilla";

// The React Version of Zustand
import createReact from "zustand";

// Application specific schema
import { UserSchema } from '@sage3/shared/types';

// The observable websocket and HTTP
import { UserHTTPService } from "../api";
import { SocketAPI } from "../utils";

interface UserState {
  user: UserSchema | undefined;
  create: (name: UserSchema['name'], email: UserSchema['email']) => Promise<void>;
  update: (updates: Partial<UserSchema>) => Promise<void>;
  subscribeToUser: () => Promise<void>;
}

/**
 * The UserStore of the current user.
 */
const UserStore = createVanilla<UserState>((set, get) => {
  const socket = SocketAPI.getInstance();
  let userSub: (() => void) | null;
  return {
    user: undefined,
    create: async (name: UserSchema['name'], email: UserSchema['email']) => {
      await UserHTTPService.create(name, email);
      get().subscribeToUser()
    },
    update: async (updates: Partial<UserSchema>) => {
      const user = get().user;
      if (!user) return;
      UserHTTPService.update(user.id, updates);
    },
    subscribeToUser: async () => {
      const response = await UserHTTPService.readCurrent();
      let currUser = undefined;
      if (response) currUser = response[0]
      set({ user: currUser })
      if (currUser === undefined) return;
      if (userSub) {
        userSub();
        userSub = null;
      }

      // Socket Subscribe Message
      const route = '/api/user/subscribe/:id';
      const body = { id: currUser.id }

      // Socket Listenting to updates from server about the current user
      userSub = socket.subscribe<UserSchema>(route, body, (message) => {
        switch (message.type) {
          case 'CREATE': {
            set({ user: message.doc.data })
            break;
          }
          case 'UPDATE': {
            set({ user: message.doc.data })
            break;
          }
          case 'DELETE': {
            set({ user: undefined })
          }
        }
      });
    }
  }
})

UserStore.getState().subscribeToUser();

// Convert the Zustand JS store to Zustand React Store
export const useUserStore = createReact(UserStore);

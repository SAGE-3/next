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
import { User, UserSchema } from '@sage3/shared/types';

// The observable websocket and HTTP
import { APIHttp } from "../api";
import { SocketAPI } from "../utils";
import { randomSAGEColor } from "@sage3/shared";

interface UserState {
  user: User | undefined;
  create: (newuser: UserSchema) => Promise<void>;
  update: (updates: Partial<UserSchema>) => Promise<void>;
  subscribeToUser: (id: string) => Promise<void>;
}

/**
 * The UserStore of the current user.
 */
const UserStore = createVanilla<UserState>((set, get) => {
  let userSub: (() => void) | null = null;
  SocketAPI.init()
  return {
    user: undefined,
    create: async (newuser: UserSchema) => {
      const user = await APIHttp.POST<UserSchema, User>('/users', newuser);
      if (user.data) {
        get().subscribeToUser(user.data[0]._id)
      }
    },
    update: async (updates: Partial<UserSchema>) => {
      const user = get().user;
      if (!user) return;
      const putResponse = await APIHttp.PUT<UserSchema>(`/users/${user._id}`, updates);
      console.log(putResponse);
    },
    subscribeToUser: async (id: string) => {
      const getResponse = await APIHttp.GET<UserSchema, User>(`/users/${id}`);
      let user = null;
      if (getResponse.data) {
        user = getResponse.data[0];
        set({ user })
      } else {
        const newuser = {
          name: `Anonymous`,
          email: 'anon@anon.com',
          color: randomSAGEColor().name,
          userRole: 'user',
          userType: 'client',
          profilePicture: ''
        } as UserSchema;
        const postResponse = await APIHttp.POST<UserSchema, User>(`/users`, newuser);
        if (postResponse.data) {
          user = postResponse.data[0];
          set({ user })
        }
      }

      if (!user) return;
      // Unsubscribe old subscription
      if (userSub) {
        userSub();
        userSub = null;
      }
      // Socket Subscribe Message
      const route = `/users/${user._id}`;
      // Socket Listenting to updates from server about the current user
      userSub = await SocketAPI.subscribe<UserSchema>(route, (message) => {
        const doc = message.doc as User;
        switch (message.type) {
          case 'CREATE': {
            set({ user: doc })
            break;
          }
          case 'UPDATE': {
            set({ user: doc })
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

// Convert the Zustand JS store to Zustand React Store
export const useUserStore = createReact(UserStore);

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
import { UserSchema, UserWS } from '@sage3/shared/types';

// The observable websocket and HTTP
import { UserHTTPService } from "../api";
import { SocketAPI } from "../utils";

interface UserState {
  user: UserSchema | undefined;
  createUser: (name: UserSchema['name'], email: UserSchema['email']) => void;
  updateName: (name: UserSchema['name']) => void;
  updateEmail: (email: UserSchema['email']) => void;
  updateColor: (color: UserSchema['color']) => void;
  updateProfilePicture: (profilePicture: UserSchema['profilePicture']) => void;
  updateUserRole: (userRole: UserSchema['userRole']) => void;
  updateUserType: (userType: UserSchema['userType']) => void;
  subscribeToCurrentUser: () => Promise<UserSchema | undefined>;
}

/**
 * The UserStore of the current user.
 */
const UserStore = createVanilla<UserState>((set, get) => {
  const socket = SocketAPI.getInstance();
  let userSub: (() => void) | null;
  return {
    user: undefined,
    createUser(name: UserSchema['name'], email: UserSchema['email']) {
      UserHTTPService.createUser(name, email);
    },
    updateName(name: UserSchema['name']) {
      UserHTTPService.updateName(name);
    },
    updateEmail(email: UserSchema['email']) {
      UserHTTPService.updateEmail(email);
    },
    updateColor(color: UserSchema['color']) {
      UserHTTPService.updateColor(color);
    },
    updateProfilePicture(profilePicture: UserSchema['profilePicture']) {
      UserHTTPService.updateProfilePicture(profilePicture);
    },
    updateUserRole(userRole: UserSchema['userRole']) {
      UserHTTPService.updateUserRole(userRole);
    },
    updateUserType(userType: UserSchema['userType']) {
      UserHTTPService.updateUserType(userType);
    },
    subscribeToCurrentUser: async () => {
      const user = await UserHTTPService.readCurrentUser();
      if (user) {
        set({ user })
      }
      if (userSub) {
        userSub();
        userSub = null;
      }
      // Socket Subscribe Message
      const message = {
        type: 'sub',
        route: '/api/user/subscribe/current',
      } as UserWS.UserCurrentSub;

      // Socket Listenting to updates from server about the current user
      userSub = socket.subscribe<UserSchema>(message, (message) => {
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
      return user;
    }
  }
})

// Convert the Zustand JS store to Zustand React Store
export const useUserStore = createReact(UserStore);

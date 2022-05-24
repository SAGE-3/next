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
import { AppWS } from '@sage3/shared/types';

// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { AppSchema } from '@sage3/applications';

// The observable websocket and HTTP
import { AppHTTPService } from "../api";
import { SocketAPI } from "../utils";
import { SBPrimitive } from "@sage3/sagebase";

interface AppState {
  apps: AppSchema[];
  createApp: (name: AppSchema['name'], description: AppSchema['description'], roomId: AppSchema['roomId'], boardId: AppSchema['boardId'], type: string, state: SBPrimitive) => void;
  updateName: (id: AppSchema['id'], name: AppSchema['name']) => void;
  updateDescription: (id: AppSchema['id'], email: AppSchema['description']) => void;
  updateOwnerId: (id: AppSchema['id'], ownerId: AppSchema['ownerId']) => void;
  updateRoomId: (id: AppSchema['id'], roomId: AppSchema['roomId']) => void;
  updateBoardId: (id: AppSchema['id'], boardId: AppSchema['boardId']) => void;
  deleteApp: (id: AppSchema['id']) => void;
  subscribeByBoardId: (boardId: AppSchema['boardId']) => Promise<void>;
}

/**
 * The AppStore.
 */
const AppStore = createVanilla<AppState>((set, get) => {
  const socket = SocketAPI.getInstance();
  let appsSub: (() => void) | null;
  return {
    apps: [],
    createApp(name: AppSchema['name'], description: AppSchema['description'], roomId: AppSchema['roomId'], boardId: AppSchema['boardId'], type: string, state: SBPrimitive) {
      AppHTTPService.createApp(name, description, roomId, boardId, type, state);
    },
    updateName(id: AppSchema['id'], name: AppSchema['name']) {
      AppHTTPService.updateName(id, name);
    },
    updateDescription(id: AppSchema['id'], email: AppSchema['description']) {
      AppHTTPService.updateDescription(id, email);
    },
    updateOwnerId(id: AppSchema['id'], ownerId: AppSchema['ownerId']) {
      AppHTTPService.updateOwnerId(id, ownerId);
    },
    updateRoomId(id: AppSchema['id'], roomId: AppSchema['roomId']) {
      AppHTTPService.updateRoomId(id, roomId);
    },
    updateBoardId(id: AppSchema['id'], boardId: AppSchema['boardId']) {
      AppHTTPService.updateBoardId(id, boardId);
    },
    deleteApp: (id: AppSchema['id']) => {
      AppHTTPService.deleteApp(id);
    },
    subscribeByBoardId: async (boardId: AppSchema['boardId']) => {
      const apps = await AppHTTPService.readByBoardId(boardId);
      if (apps) {
        set({ apps })
      }
      if (appsSub) {
        appsSub();
        appsSub = null;
      }

      // Socket Subscribe Message
      const message = {
        type: 'sub',
        route: '/api/app/subscribe/boardid',
        body: {
          boardId
        }
      } as AppWS.ByBoardIdSub;

      // Socket Listenting to updates from server about the current user
      appsSub = socket.subscribe<AppSchema>(message, (message) => {
        switch (message.type) {
          case 'CREATE': {
            set({ apps: [...get().apps, message.doc.data] })
            break;
          }
          case 'UPDATE': {
            const apps = [...get().apps];
            const idx = apps.findIndex(el => el.id === message.doc.data.id);
            if (idx > -1) {
              apps[idx] = message.doc.data;
            }
            set({ apps: apps })
            break;
          }
          case 'DELETE': {
            const apps = [...get().apps];
            const idx = apps.findIndex(el => el.id === message.doc.data.id);
            if (idx > -1) {
              apps.splice(idx, 1);
            }
            set({ apps: apps })
          }
        }
      });
    }
  }
})


// Convert the Zustand JS store to Zustand React Store
export const useAppStore = createReact(AppStore);

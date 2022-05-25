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
import { AppSchema, AppStates, AppWS } from '@sage3/shared/types';
import { genId } from '@sage3/shared';

// The observable websocket and HTTP
import { AppHTTPService } from "../api";
import { SocketAPI } from "../utils";

interface AppState {
  apps: AppSchema[];
  createApp: (name: AppSchema['name'], description: AppSchema['description'], roomId: AppSchema['roomId'], boardId: AppSchema['boardId'], type: AppSchema['type'], state: AppSchema['state']) => void;
  updateName: (id: AppSchema['id'], name: AppSchema['name']) => void;
  updateDescription: (id: AppSchema['id'], email: AppSchema['description']) => void;
  updateOwnerId: (id: AppSchema['id'], ownerId: AppSchema['ownerId']) => void;
  updateRoomId: (id: AppSchema['id'], roomId: AppSchema['roomId']) => void;
  updateBoardId: (id: AppSchema['id'], boardId: AppSchema['boardId']) => void;
  deleteApp: (id: AppSchema['id']) => void;
  updateState: (id: AppSchema['id'], state: Partial<AppStates>) => Promise<void>;
  subscribeByBoardId?: (boardId: AppSchema['boardId']) => Promise<void>;
}

/**
 * The AppStore.
 */
const AppStore = createVanilla<AppState>((set, get) => {
  const socket = SocketAPI.getInstance();
  let appsSub: (() => void) | null;
  return {
    apps: [],
    createApp(name: AppSchema['name'], description: AppSchema['description'], roomId: AppSchema['roomId'], boardId: AppSchema['boardId'], type: AppSchema['type'], state: AppSchema['state']) {
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
    updateState: async (id: AppSchema['id'], state: Partial<AppStates>) => {
      AppHTTPService.updateState(id, state);
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


/**
 * The AppPlaygroundStore.
 */
const AppPlaygroundStore = createVanilla<AppState>((set, get) => {
  return {
    apps: [],
    createApp: (name: AppSchema['name'], description: AppSchema['description'], roomId: AppSchema['roomId'], boardId: AppSchema['boardId'], type: AppSchema['type'], state: AppSchema['state']) => {
      const newApp = {
        id: genId(),
        name,
        description,
        roomId: genId(),
        boardId: genId(),
        ownerId: genId(),
        type,
        state
      } as AppSchema;

      set({ apps: [...get().apps, newApp] })
    },
    updateName: (id: AppSchema['id'], name: AppSchema['name']) => {
      const apps = [...get().apps];
      set({ apps: apps.map(app => (app.id === id) ? { ...app, state: { ...app.state, name } } : app) })
    },
    updateDescription: (id: AppSchema['id'], description: AppSchema['description']) => {
      const apps = [...get().apps];
      set({ apps: apps.map(app => (app.id === id) ? { ...app, state: { ...app.state, description } } : app) })
    },
    updateOwnerId: (id: AppSchema['id'], ownerId: AppSchema['ownerId']) => {
      const apps = [...get().apps];
      set({ apps: apps.map(app => (app.id === id) ? { ...app, state: { ...app.state, ownerId } } : app) })
    },
    updateRoomId: (id: AppSchema['id'], roomId: AppSchema['roomId']) => {
      const apps = [...get().apps];
      set({ apps: apps.map(app => (app.id === id) ? { ...app, state: { ...app.state, roomId } } : app) })
    },
    updateBoardId: (id: AppSchema['id'], boardId: AppSchema['boardId']) => {
      const apps = [...get().apps];
      set({ apps: apps.map(app => (app.id === id) ? { ...app, state: { ...app.state, boardId } } : app) })
    },
    updateState: async (id: AppSchema['id'], update: Partial<AppStates>) => {
      const apps = [...get().apps];
      set({ apps: apps.map(app => (app.id === id) ? { ...app, state: { ...app.state, ...update } } : app) })
    },
    deleteApp: (id: AppSchema['id']) => {
      set({ apps: get().apps.filter(app => app.id !== id) })
    },
  }
})

const playground = (process.env.NX_TASK_TARGET_PROJECT === 'sage3-app-playground');
// Convert the Zustand JS store to Zustand React Store
export const useAppStore = (playground) ? createReact(AppPlaygroundStore) : createReact(AppStore)


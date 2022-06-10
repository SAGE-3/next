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
import { genId } from '@sage3/shared';

// The observable websocket and HTTP
import { AppHTTPService } from '../api';
import { SocketAPI } from '../utils';

import { AppState, AppSchema } from '@sage3/applications/schema';

interface Applications {
  apps: AppSchema[];
  create: (
    name: AppSchema['name'],
    description: AppSchema['description'],
    roomId: AppSchema['roomId'],
    boardId: AppSchema['boardId'],
    position: AppSchema['position'],
    size: AppSchema['size'],
    rotation: AppSchema['rotation'],
    type: AppSchema['type'],
    state: Partial<AppSchema['state']>
  ) => Promise<void>;
  update: (id: AppSchema['id'], updates: Partial<AppSchema>) => Promise<void>;
  updateState: (id: AppSchema['id'], state: Partial<AppState>) => Promise<void>;
  delete: (id: AppSchema['id']) => Promise<void>;
  subscribeByBoardId: (boardId: AppSchema['boardId']) => Promise<void>;
}

/**
 * The AppStore.
 */
const AppStore = createVanilla<Applications>((set, get) => {
  const socket = SocketAPI.getInstance();
  let appsSub: (() => Promise<void>) | null = null;
  return {
    apps: [],
    create: async (
      name: AppSchema['name'],
      description: AppSchema['description'],
      roomId: AppSchema['roomId'],
      boardId: AppSchema['boardId'],
      position: AppSchema['position'],
      size: AppSchema['size'],
      rotation: AppSchema['rotation'],
      type: AppSchema['type'],
      state: Partial<AppSchema['state']>
    ) => {
      AppHTTPService.create(name, description, roomId, boardId, position, size, rotation, type, state);
    },
    update: async (id: AppSchema['id'], updates: Partial<AppSchema>) => {
      AppHTTPService.update(id, updates);
    },
    updateState: async (id: AppSchema['id'], state: Partial<AppState>) => {
      AppHTTPService.updateState(id, state);
    },
    delete: async (id: AppSchema['id']) => {
      AppHTTPService.del(id);
    },
    subscribeByBoardId: async (boardId: AppSchema['boardId']) => {
      const apps = await AppHTTPService.query({ boardId });
      if (apps) {
        set({ apps });
      }

      // Unsubscribe old subscription
      if (appsSub) {
        await appsSub();
        appsSub = null;
      }

      const route = `/api/apps/subscribebyboardid/${boardId}`;
      // Socket Listenting to updates from server about the current user
      appsSub = await socket.subscribe<AppSchema>(route, (message) => {
        switch (message.type) {
          case 'CREATE': {
            set({ apps: [...get().apps, message.doc.data] });
            break;
          }
          case 'UPDATE': {
            const apps = [...get().apps];
            const idx = apps.findIndex((el) => el.id === message.doc.data.id);
            if (idx > -1) {
              apps[idx] = message.doc.data;
            }
            set({ apps: apps });
            break;
          }
          case 'DELETE': {
            const apps = [...get().apps];
            const idx = apps.findIndex((el) => el.id === message.doc.data.id);
            if (idx > -1) {
              apps.splice(idx, 1);
            }
            set({ apps: apps });
          }
        }
      });
    },
  };
});

/**
 * The AppPlaygroundStore.
 */
const AppPlaygroundStore = createVanilla<Applications>((set, get) => {
  return {
    apps: [],
    create: async (
      name: AppSchema['name'],
      description: AppSchema['description'],
      roomId: AppSchema['roomId'],
      boardId: AppSchema['boardId'],
      position: AppSchema['position'],
      size: AppSchema['size'],
      rotation: AppSchema['rotation'],
      type: AppSchema['type'],
      state: Partial<AppSchema['state']>
    ) => {
      const newApp = {
        id: genId(),
        name,
        description,
        roomId: genId(),
        boardId: genId(),
        ownerId: genId(),
        position,
        size,
        rotation,
        type,
        state,
      } as AppSchema;

      set({ apps: [...get().apps, newApp] });
    },
    update: async (id: AppSchema['id'], updates: Partial<AppSchema>) => {
      const apps = [...get().apps];
      set({ apps: apps.map((app) => (app.id === id ? { ...app, ...updates } : app)) });
    },
    updateState: async (id: AppSchema['id'], updates: Partial<AppState>) => {
      const apps = [...get().apps];
      set({ apps: apps.map((app) => (app.id === id ? { ...app, state: { ...app.state, ...updates } } : app)) });
    },
    delete: async (id: AppSchema['id']) => {
      set({ apps: get().apps.filter((app) => app.id !== id) });
    },
    subscribeByBoardId: async (boardId: AppSchema['boardId']) => {
      console.log('Subscribing to apps by boardId not required in the playground');
    },
  };
});

const playground = process.env.NX_TASK_TARGET_PROJECT === 'playground';

// Convert the Zustand JS store to Zustand React Store
export const useAppStore = playground ? createReact(AppPlaygroundStore) : createReact(AppStore);

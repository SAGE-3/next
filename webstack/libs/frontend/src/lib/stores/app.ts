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
import { APIHttp, SocketAPI } from '../api';

import { AppState, AppSchema, App } from '@sage3/applications/schema';
import { BoardSchema } from '@sage3/shared/types';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

interface Applications {
  apps: App[];
  error: { id?: string; msg: string } | null;
  clearError: () => void;
  create: (newApp: AppSchema) => Promise<any>;
  update: (id: string, updates: Partial<AppSchema>) => Promise<void>;
  updateState: (id: string, state: Partial<AppState>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  unsubToBoard: () => void;
  subToBoard: (boardId: AppSchema['boardId']) => Promise<void>;
}

/**
 * The AppStore.
 */
const AppStore = createVanilla<Applications>((set, get) => {
  let boardSub: (() => void) | null = null;
  return {
    apps: [],
    error: null,
    clearError: () => {
      set({ error: null });
    },
    create: async (newApp: AppSchema) => {
      const app = await SocketAPI.sendRESTMessage('/apps', 'POST', newApp);
      if (!app.success) {
        set({ error: { msg: app.message } });
      }
      return app;
    },
    update: async (id: string, updates: Partial<AppSchema>) => {
      const res = await SocketAPI.sendRESTMessage('/apps/' + id, 'PUT', updates);
      if (!res.success) {
        set({ error: { id, msg: res.message } });
      }
    },
    updateState: async (id: string, state: Partial<AppState>) => {
      // HOT FIX: This is a hack to make the app state update work.
      // Not really type safe and I need to figure out a way to do nested props properly.
      const update = {} as any;
      for (const key in state) {
        const value = (state as any)[key];
        update[`state.${key}`] = (state as any)[key];
      }
      const res = await SocketAPI.sendRESTMessage('/apps/' + id, 'PUT', update);
      if (!res.success) {
        set({ error: { msg: res.message } });
      }
    },
    delete: async (id: string) => {
      const res = await SocketAPI.sendRESTMessage('/apps/' + id, 'DELETE');
      if (!res.success) {
        set({ error: { id, msg: res.message } });
      }
    },
    unsubToBoard: () => {
      // Unsubscribe old subscription
      if (boardSub) {
        boardSub();
        boardSub = null;
      }
      set({ apps: [] });
    },
    subToBoard: async (boardId: AppSchema['boardId']) => {
      set({ apps: [] });
      const apps = await APIHttp.GET<AppSchema, App>('/apps', { boardId });
      if (apps.success) {
        set({ apps: apps.data });
      } else {
        set({ error: { msg: apps.message || 'subscription error' } });
        return;
      }

      // Unsubscribe old subscription
      if (boardSub) {
        boardSub();
        boardSub = null;
      }

      const route = `/subscription/boards/${boardId}`;
      // Socket Listenting to updates from server about the current user
      boardSub = await SocketAPI.subscribe<AppSchema | BoardSchema>(route, (message) => {
        if (message.col !== 'APPS') return;
        const doc = message.doc as App;
        switch (message.type) {
          case 'CREATE': {
            set({ apps: [...get().apps, doc] });
            break;
          }
          case 'UPDATE': {
            const apps = [...get().apps];
            const idx = apps.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              apps[idx] = doc;
            }
            set({ apps: apps });
            break;
          }
          case 'DELETE': {
            const apps = [...get().apps];
            const idx = apps.findIndex((el) => el._id === doc._id);
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
    error: null,
    clearError: () => {
      set({ error: null });
    },
    create: async (newApp: AppSchema) => {
      const app = {
        _id: genId(),
        _createdAt: new Date().getTime(),
        _updatedAt: new Date().getTime(),
        _updatedBy: '-',
        data: newApp,
      } as App;
      set({ apps: [...get().apps, app] });
    },
    update: async (id: string, updates: Partial<AppSchema>) => {
      const apps = [...get().apps];
      set({ apps: apps.map((app) => (app._id === id ? { ...app, data: { ...app.data, ...updates } } : app)) });
    },
    updateState: async (id: string, updates: Partial<AppState>) => {
      const apps = [...get().apps];
      set({
        apps: apps.map((app) => (app._id === id ? { ...app, data: { ...app.data, state: { ...app.data.state, ...updates } } } : app)),
      });
    },
    delete: async (id: string) => {
      set({ apps: get().apps.filter((app) => app._id !== id) });
    },
    unsubToBoard: () => {
      console.log('Unsubscribing to apps is not required in the playground');
    },
    subToBoard: async (boardId: AppSchema['boardId']) => {
      console.log('Subscribing to apps is not required in the playground');
    },
  };
});

const playground = process.env.NX_TASK_TARGET_PROJECT === 'playground';
// Convert the Zustand JS store to Zustand React Store
export const useAppStore = playground ? createReact(AppPlaygroundStore) : createReact(AppStore);

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('AppStore', useAppStore);

/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Zustand
import { create } from 'zustand';
// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

import { AppState, AppSchema, App } from '@sage3/applications/schema';
import { Board } from '@sage3/shared/types';
// App intial Values
import { initialValues } from '@sage3/applications/initialValues';
import { SAGE3Ability } from '@sage3/shared';

// The observable websocket and HTTP
import { APIHttp, SocketAPI } from '../api';

interface Applications {
  apps: App[];
  error: { id?: string; msg: string } | null;
  fetched: boolean;

  clearError: () => void;
  create: (newApp: AppSchema) => Promise<{ success: boolean; message: string; data: App }>;
  createBatch: (newApps: AppSchema[]) => Promise<any>;
  update: (id: string, updates: Partial<AppSchema>) => Promise<boolean>;
  updateBatch: (updates: { id: string; updates: Partial<AppSchema> }[]) => Promise<void>;
  updateState: (id: string, state: Partial<AppState>) => Promise<void>;
  updateStateBatch: (updates: { id: string; updates: Partial<AppState> }[]) => Promise<void>;
  delete: (id: string | string[]) => Promise<void>;
  unsubToBoard: (uid: string) => void;
  subToBoard: (boardId: AppSchema['boardId']) => Promise<void>;
  fetchBoardApps: (boardId: AppSchema['boardId']) => Promise<App[] | undefined>;

  duplicateApps: (appIds: string[], board?: Board) => Promise<void>;

  bringForward(appId: string): void;
  updateAppLocationByDelta: (delta: { x: number; y: number }, appIds: string[]) => Promise<void>;
}

/**
 * The AppStore.
 */
const AppStore = create<Applications>()((set, get) => {
  let appsSub: (() => void) | null = null;
  return {
    apps: [],
    error: null,
    fetched: false,

    clearError: () => {
      set({ error: null });
    },
    create: async (newApp: AppSchema) => {
      if (!SAGE3Ability.canCurrentUser('create', 'apps')) return;
      const app = await SocketAPI.sendRESTMessage('/apps', 'POST', newApp);
      if (!app.success) {
        set({ error: { msg: app.message } });
      }
      return app;
    },
    createBatch: async (newApps: AppSchema[]) => {
      if (!SAGE3Ability.canCurrentUser('create', 'apps')) return;
      const res = await SocketAPI.sendRESTMessage('/apps', 'POST', { batch: newApps });
      if (!res.success) {
        set({ error: { msg: res.message } });
      }
    },
    update: async (id: string, updates: Partial<AppSchema>) => {
      if (!SAGE3Ability.canCurrentUser('update', 'apps')) return false;
      const res = await SocketAPI.sendRESTMessage('/apps/' + id, 'PUT', updates);
      if (!res.success) {
        set({ error: { id, msg: res.message } });
        return false;
      }
      return true;
    },
    updateBatch: async (updates: { id: string; updates: Partial<AppSchema> }[]) => {
      if (!SAGE3Ability.canCurrentUser('update', 'apps')) return;
      const res = await SocketAPI.sendRESTMessage('/apps', 'PUT', { batch: updates });
      if (!res.success) {
        set({ error: { id: updates[0].id, msg: res.message } });
      }
    },
    updateState: async (id: string, state: Partial<AppState>) => {
      // HOT FIX: This is a hack to make the app state update work.
      // Not really type safe and I need to figure out a way to do nested props properly.
      if (!SAGE3Ability.canCurrentUser('update', 'apps')) return;
      const update = {} as any;
      for (const key in state) {
        update[`state.${key}`] = (state as any)[key];
      }
      const res = await SocketAPI.sendRESTMessage('/apps/' + id, 'PUT', update);
      if (!res.success) {
        set({ error: { msg: res.message } });
      }
    },
    updateStateBatch: async (updates: { id: string; updates: Partial<AppState> }[]) => {
      // HOT FIX: This is a hack to make the app state update work.
      // Not really type safe and I need to figure out a way to do nested props properly.
      if (!SAGE3Ability.canCurrentUser('update', 'apps')) return;
      updates.forEach((u) => {
        const revisedUpdates = {} as any;
        for (const key in u.updates) {
          revisedUpdates[`state.${key}`] = (u.updates as any)[key];
        }
        u.updates = revisedUpdates;
      });
      const res = await SocketAPI.sendRESTMessage('/apps', 'PUT', { batch: updates });
      if (!res.success) {
        set({ error: { msg: res.message } });
      }
    },
    delete: async (id: string | string[]) => {
      if (!SAGE3Ability.canCurrentUser('delete', 'apps')) return;
      if (Array.isArray(id)) {
        const res = await SocketAPI.sendRESTMessage('/apps', 'DELETE', { batch: id });
        if (!res.success) {
          set({ error: { msg: res.message ? res.message : '' } });
        }
      } else {
        const res = await SocketAPI.sendRESTMessage('/apps/' + id, 'DELETE');
        if (!res.success) {
          set({ error: { id, msg: res.message } });
        }
      }
    },
    subToBoard: async (boardId: AppSchema['boardId']) => {
      if (!SAGE3Ability.canCurrentUser('read', 'apps')) return;
      set({ apps: [], fetched: false });
      const apps = await APIHttp.QUERY<App>('/apps', { boardId });
      if (apps.success) {
        set({ apps: apps.data, fetched: true });
      } else {
        set({ error: { msg: apps.message || 'subscription error' } });
        return;
      }

      // Unsubscribe old subscription
      if (appsSub) {
        appsSub();
        appsSub = null;
      }

      // const route = `/subscription/boards/${boardId}`;
      const route = `/apps?boardId=${boardId}`;
      // Socket Listenting to updates from server about the current user
      appsSub = await SocketAPI.subscribe<App>(route, (message) => {
        if (message.col !== 'APPS') return;
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc as App[];
            set({ apps: [...get().apps, ...docs] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc as App[];
            const apps = [...get().apps];
            docs.forEach((doc) => {
              const idx = apps.findIndex((el) => el._id === doc._id);
              if (idx > -1) {
                apps[idx] = doc;
              }
            });
            set({ apps: apps });
            break;
          }
          case 'DELETE': {
            const docs = message.doc as App[];
            const ids = docs.map((d) => d._id);
            const apps = [...get().apps];
            const remainingApps = apps.filter((a) => !ids.includes(a._id));
            set({ apps: remainingApps });
          }
        }
      });
    },
    unsubToBoard: (uid: string) => {
      // Unsubscribe old subscription
      if (appsSub) {
        appsSub();
        appsSub = null;
      }
      // Delete all your sreenshares when leaving board
      get()
        .apps.filter((a) => a._createdBy === uid && a.data.type === 'Screenshare')
        .forEach((a) => get().delete(a._id));
      set({ apps: [] });
    },
    duplicateApps: async (appIds: string[], board?: Board) => {
      if (!SAGE3Ability.canCurrentUser('create', 'apps')) return;
      // Get the current apps
      const apps = get().apps;
      // Find the apps to copy
      const appsToCopy = apps.filter((a) => appIds.includes(a._id));
      // Duplicate to another board
      if (board) {
        const otherBoardsApps = await APIHttp.QUERY<App>('/apps', { boardId: board._id });
        if (otherBoardsApps.data && otherBoardsApps.data.length > 0) {
          // If other board has apps try to copy smartly
          // Right now it just places them in the bottom right corner of all the other board's apps
          let deltaX = 0;
          let deltaY = 0;
          // Used for Stickie
          let topCorner = { x: 0, y: 0 };
          // Calculate bottom right corner of other boards apps
          const xVals = otherBoardsApps.data.map((a) => a.data.position.x);
          const yVals = otherBoardsApps.data.map((a) => a.data.position.y + a.data.size.height);
          const xValMin = Math.min(...xVals);
          const yValMax = Math.max(...yVals);
          // Calculate top left corner of lassoed apps
          const xVals2 = appsToCopy.map((a) => a.data.position.x);
          const yVals2 = appsToCopy.map((a) => a.data.position.y);
          const xValMin2 = Math.min(...xVals2);
          const yValMin2 = Math.min(...yVals2);
          // Calulate the delta
          deltaX = xValMin - xValMin2;
          deltaY = yValMax - yValMin2;
          topCorner = { x: xValMin2 + deltaX, y: yValMin2 + deltaY };
          // Add some buffer
          deltaY += 50;
          topCorner.y += 50;
          const newApps = [] as AppSchema[];
          appsToCopy.forEach((app) => {
            // Deep Copy those apps
            const state = structuredClone(app.data);
            // Update boardId and apply the delta shift
            state.boardId = board._id;
            state.position.x += deltaX;
            state.position.y += deltaY;
            newApps.push(state);
          });
          // Create the apps
          await get().createBatch(newApps);
          // Create Stickie To label where the apps came from.
          await get().create({
            title: `Apps Copied From ${board.data.name}`,
            roomId: board.data.roomId,
            boardId: board._id,
            position: { ...{ x: topCorner.x - 450, y: topCorner.y }, z: 0 },
            size: { width: 400, height: 420, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Stickie',
            state: {
              ...initialValues['Stickie'],
              text: `Apps Copied from the Board named: ${board.data.name} \n ➡️ \n ➡️ \n ➡️ \n ➡️ \n`,
              color: board.data.color,
            },
            raised: true,
            dragging: false,
            pinned: false,
          });
        } else {
          const newApps = [] as AppSchema[];
          // If the other board has no apps, just copy them over
          appsToCopy.forEach((app) => {
            // Deep Copy
            const state = structuredClone(app.data);
            state.boardId = board._id;
            newApps.push(state);
          });
          get().createBatch(newApps);
        }
      } else {
        // Duplicate on same board
        // One Way to Copy. Can come up with other ways
        // This copies the apps to the right. Of all the selected apps.
        // Caluclate the amount to shift the new apps to the right.
        let xShift = 0;
        let xmin = Number.POSITIVE_INFINITY;
        let xmax = Number.NEGATIVE_INFINITY;
        appsToCopy.forEach((a) => {
          const s = a.data.size;
          const p = a.data.position;
          const right = p.x + s.width;
          xmin = Math.min(xmin, p.x);
          xmax = Math.max(xmax, right);
        });
        xShift = xmax - xmin + 40;
        // Duplicate all the apps
        const newApps = [] as AppSchema[];
        appsToCopy.forEach((app) => {
          // Deep Copy
          const state = structuredClone(app.data);
          state.position.x += xShift;
          // Add to the batch
          newApps.push(state);
        });
        get().createBatch(newApps);
      }
    },

    async fetchBoardApps(boardId: AppSchema['boardId']) {
      if (!SAGE3Ability.canCurrentUser('read', 'apps')) return;
      const apps = await APIHttp.QUERY<App>('/apps', { boardId });
      if (apps.success) {
        return apps.data;
      } else {
        return undefined;
      }
    },
    bringForward: (appId: string) => {
      const apps = get().apps;
      const updates = [] as { id: string; updates: Partial<AppSchema> }[];
      // Raise down all the other apps, if needed
      apps.forEach((a) => {
        if (a.data.raised && a._id !== appId) updates.push({ id: a._id, updates: { raised: false } });
      });
      updates.push({ id: appId, updates: { raised: true } });
      get().updateBatch(updates);
    },
    updateAppLocationByDelta: async (delta: { x: number; y: number }, appIds: string[]) => {
      // Collect all the apps that are not pinned
      const updates = appIds.reduce<{ id: string; updates: Partial<AppSchema> }[]>((acc, id) => {
        const app = get().apps.find((a) => a._id === id);
        if (app && !app.data.pinned)
          acc.push({ id, updates: { position: { x: app.data.position.x + delta.x, y: app.data.position.y + delta.y, z: 0 } } });
        return acc;
      }, []);
      // Send the updates
      get().updateBatch(updates);
    },
  };
});

// Export the Zustand store
export const useAppStore = AppStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('AppStore', useAppStore);

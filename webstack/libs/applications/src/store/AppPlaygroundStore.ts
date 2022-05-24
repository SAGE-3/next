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
import { AppSchema, AppStates, AppTypes } from '@sage3/applications';
import { genId } from '@sage3/shared';


interface AppState {
  apps: AppSchema[];
  createApp: (name: AppSchema['name'], description: AppSchema['description'], type: AppTypes, state: AppStates) => void;
  updateName: (id: AppSchema['id'], name: AppSchema['name']) => void;
  updateDescription: (id: AppSchema['id'], email: AppSchema['description']) => void;
  updateState: (id: AppSchema['id'], update: Partial<AppStates>) => void;
  deleteApp: (id: AppSchema['id']) => void;
}

/**
 * The AppPlaygroundStore.
 */
const AppPlaygroundStore = createVanilla<AppState>((set, get) => {
  return {
    apps: [],
    createApp(name: AppSchema['name'], description: AppSchema['description'], type: AppTypes, state: AppStates) {
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
    updateName(id: AppSchema['id'], name: AppSchema['name']) {
      const apps = [...get().apps];
      set({ apps: apps.map(app => (app.id === id) ? { ...app, state: { ...app.state, name } } : app) })
    },
    updateDescription(id: AppSchema['id'], description: AppSchema['description']) {
      const apps = [...get().apps];
      set({ apps: apps.map(app => (app.id === id) ? { ...app, state: { ...app.state, description } } : app) })
    },
    updateState(id: AppSchema['id'], update: Partial<AppStates>) {
      const apps = [...get().apps];
      set({ apps: apps.map(app => (app.id === id) ? { ...app, state: { ...app.state, ...update } } : app) })
    },
    deleteApp: (id: AppSchema['id']) => {
      set({ apps: get().apps.filter(app => app.id !== id) })
    },
  }
})


// Convert the Zustand JS store to Zustand React Store
export const useAppStore = createReact(AppPlaygroundStore);

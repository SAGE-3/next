/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// The JS version of Zustand
import createVanilla from 'zustand/vanilla';

// The React Version of Zustand
import createReact from 'zustand';

// Application specific schema
import { Presence, PresenceSchema } from '@sage3/shared/types';
import { APIHttp, SocketAPI } from '../api';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

interface PresenceState {
  presences: Presence[];
  error: string | null;
  clearError: () => void;
  update: (id: string, updates: Partial<PresenceSchema>) => void;
  subscribe: () => Promise<void>;
}

/**
 * The PresenceStore.
 */
const PresenceStore = createVanilla<PresenceState>((set, get) => {
  APIHttp.GET<Presence>('/presence').then((response) => {
    if (response.success) {
      set({ presences: response.data });
    }
  });
  let presenceSub: (() => void) | null = null;
  return {
    presences: [],
    error: null,
    clearError: () => {
      set({ error: null });
    },
    update: async (id: string, updates: Partial<PresenceSchema>) => {
      const res = await SocketAPI.sendRESTMessage(`/presence/${id}`, 'PUT', updates);
      if (!res.success) {
        set({ error: res.message });
      }
    },
    subscribe: async () => {
      set({ presences: [] });
      const reponse = await APIHttp.GET<Presence>('/presence');
      if (reponse.success) {
        set({ presences: reponse.data });
      } else {
        set({ error: reponse.message });
        return;
      }
      // Unsubscribe old subscription
      if (presenceSub) {
        presenceSub();
        presenceSub = null;
      }

      // Socket Subscribe Message
      const route = `/presence`;
      presenceSub = await SocketAPI.subscribe<Presence>(route, (message) => {
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc as Presence[];
            set({ presences: [...get().presences, ...docs] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc as Presence[];
            const presences = [...get().presences];
            docs.forEach((doc) => {
              const idx = presences.findIndex((el) => el._id === doc._id);
              if (idx > -1) {
                presences[idx] = doc;
              }
            });
            set({ presences });
            break;
          }
          case 'DELETE': {
            const docs = message.doc as Presence[];
            const ids = docs.map((d) => d._id);
            const presences = [...get().presences];
            const remainingPresences = presences.filter((a) => !ids.includes(a._id));
            set({ presences: remainingPresences });
          }
        }
      });
    },
  };
});

// Convert the Zustand JS store to Zustand React Store
export const usePresenceStore = createReact(PresenceStore);

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('PresenceStore', usePresenceStore);

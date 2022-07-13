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
import { BoardSchema, Presence, PresenceSchema, RoomSchema } from '@sage3/shared/types';
import { APIHttp, SocketAPI } from '../api';
import { AppSchema } from '@sage3/applications/schema';

interface PresenceState {
  presences: Presence[];
  subscribe: () => Promise<void>;
}

/**
 * The PresenceStore.
 */
const PresenceStore = createVanilla<PresenceState>((set, get) => {
  APIHttp.GET<PresenceSchema, Presence>('/presence').then((response) => {
    if (response.success) {
      set({ presences: response.data });
    }
  });
  let presenceSub: (() => void) | null = null;
  return {
    presences: [],
    subscribe: async () => {
      set({ presences: [] });
      const reponse = await APIHttp.GET<PresenceSchema, Presence>('/presence');
      if (reponse.success) {
        set({ presences: reponse.data });
      }
      // Unsubscribe old subscription
      if (presenceSub) {
        presenceSub();
        presenceSub = null;
      }

      // Socket Subscribe Message
      const route = `/presence`;
      presenceSub = await SocketAPI.subscribe<RoomSchema | BoardSchema | AppSchema | PresenceSchema>(route, (message) => {
        const doc = message.doc as Presence;
        switch (message.type) {
          case 'CREATE': {
            set({ presences: [...get().presences, doc] });
            break;
          }
          case 'UPDATE': {
            const presences = [...get().presences];
            const idx = presences.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              presences[idx] = doc;
            }
            set({ presences: presences });
            break;
          }
          case 'DELETE': {
            const presences = [...get().presences];
            const idx = presences.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              presences.splice(idx, 1);
            }
            set({ presences: presences });
          }
        }
      });
    },
  };
});

// Convert the Zustand JS store to Zustand React Store
export const usePresenceStore = createReact(PresenceStore);

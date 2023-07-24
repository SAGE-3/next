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
import { Presence, PresencePartial, PresenceSchema } from '@sage3/shared/types';
import { APIHttp, SocketAPI } from '../api';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

interface PresenceState {
  presences: Presence[];
  partialPrescences: PresencePartial[];
  error: string | null;
  clearError: () => void;
  update: (id: string, updates: Partial<PresenceSchema>) => void;
  subscribe: () => Promise<void>;
  setPartialPresence: (presences: Presence[]) => void;
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
    partialPrescences: [],
    error: null,
    setPartialPresence: (presences: Presence[]) => {
      const partialPrescences = presences.map((p) => {
        // Neat trick to remove cursor and viewport from the data
        const { cursor, viewport, ...partial } = p.data;
        return { ...p, data: partial } as PresencePartial;
      });
      // Check if an elements in the array changed
      // If it did, then update the state

      set({ partialPrescences });
    },
    clearError: () => {
      set({ error: null });
    },
    update: async (id: string, updates: Partial<PresenceSchema>) => {
      // const res = await SocketAPI.sendRESTMessage(`/presence/${id}`, 'PUT', updates);
      const res = await SocketAPI.sendRESTMessage('/presence/' + id, 'PUT', updates);
      if (!res.success) {
        set({ error: res.message });
      }
    },
    subscribe: async () => {
      set({ presences: [], partialPrescences: [] });
      const reponse = await APIHttp.GET<Presence>('/presence');
      if (reponse.success) {
        set({ presences: reponse.data });
        get().setPartialPresence(reponse.data as Presence[]);
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
      const route = `/subscription/presence`;
      presenceSub = await SocketAPI.subscribe<Presence>(route, (message) => {
        const presences = message.doc as Presence[];
        set({ presences });
        get().setPartialPresence(presences);
      });
    },
  };
});

// Convert the Zustand JS store to Zustand React Store
export const usePresenceStore = createReact(PresenceStore);

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('PresenceStore', usePresenceStore);

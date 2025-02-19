/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Zustand
import { create } from 'zustand';
// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

// Application specific schema
import { Presence, PresencePartial, PresenceSchema } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

import { APIHttp, SocketAPI } from '../api';

interface PresenceState {
  presences: Presence[];
  following: string;
  partialPrescences: PresencePartial[];
  error: string | null;
  clearError: () => void;
  setFollowing: (id: string) => void;
  update: (id: string, updates: Partial<PresenceSchema>) => void;
  subscribe: () => Promise<void>;
  setPartialPresence: (presences: Presence[]) => void;
}

/**
 * The PresenceStore.
 */
const PresenceStore = create<PresenceState>()((set, get) => {
  APIHttp.GET<Presence>('/presence').then((response) => {
    if (response.success) {
      set({ presences: response.data });
    }
  });
  let presenceSub: (() => void) | null = null;
  return {
    presences: [],
    partialPrescences: [],
    following: '',
    error: null,
    setFollowing: (id: string) => {
      set({ following: id });
    },
    setPartialPresence: (updatedPresences: Presence[]) => {
      // Update PartialPresences only if the user data has updated. Ignore viewport and cursor
      const dataUpdate = updatedPresences.map((p) => {
        const { viewport, cursor, ...partial } = p.data;
        return partial;
      });
      const currentData = get().partialPrescences.map((p) => {
        return p.data;
      });
      // Check if the data has changed
      if (JSON.stringify(dataUpdate) !== JSON.stringify(currentData)) {
        const partialPrescences = updatedPresences.map((p) => {
          const { viewport, cursor, ...partial } = p.data;
          return { ...p, data: partial };
        });
        set({ partialPrescences });
      }
      return;
    },
    clearError: () => {
      set({ error: null });
    },
    update: async (id: string, updates: Partial<PresenceSchema>) => {
      if (!SAGE3Ability.canCurrentUser('update', 'presence')) return;
      const res = await SocketAPI.sendRESTMessage(`/presence/${id}`, 'PUT', { ...updates, status: 'online' });
      if (!res.success) {
        set({ error: res.message });
      }
    },
    subscribe: async () => {
      if (!SAGE3Ability.canCurrentUser('read', 'presence')) return;
      set({ presences: [], partialPrescences: [] });
      const reponse = await APIHttp.GET<Presence>('/presence');
      if (reponse.success) {
        // Filter out only online users
        const onlineUsers = reponse.data?.filter((p) => p.data.status === 'online');
        set({ presences: onlineUsers });
        get().setPartialPresence(onlineUsers as Presence[]);
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
        const docs = message.doc as Presence[];
        // Filter out only online users
        const onlineUsers = docs.filter((p) => p.data.status === 'online');
        set({ presences: onlineUsers });
        get().setPartialPresence(onlineUsers);
      });
    },
  };
});

// Export the Zustand store
export const usePresenceStore = PresenceStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('PresenceStore', usePresenceStore);

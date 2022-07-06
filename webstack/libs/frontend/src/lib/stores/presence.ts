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
import { Presence, PresenceSchema } from '@sage3/shared/types';
import { APIHttp, SocketAPI } from '../api';

interface PresenceState {
  users: Presence[];
  update: (id: string, updates: Partial<PresenceSchema>) => Promise<void>;
}

/**
 * The PresenceStore.
 */
const PresenceStore = createVanilla<PresenceState>((set, get) => {
  APIHttp.GET<PresenceSchema, Presence>('/presence').then((response) => {
    console.log(response)
    if (response.success) {
      set({ users: response.data });
    }
  });
  const route = '/presence';
  SocketAPI.subscribe<PresenceSchema>(route, (message) => {
    const doc = message.doc as Presence;
    switch (message.type) {
      case 'CREATE': {
        set({ users: [...get().users, doc] });
        break;
      }
      case 'UPDATE': {
        const rooms = [...get().users];
        const idx = rooms.findIndex((el) => el._id === doc._id);
        if (idx > -1) {
          rooms[idx] = doc;
        }
        set({ users: rooms });
        break;
      }
      case 'DELETE': {
        const rooms = [...get().users];
        const idx = rooms.findIndex((el) => el._id === doc._id);
        if (idx > -1) {
          rooms.splice(idx, 1);
        }
        set({ users: rooms });
      }
    }
  });

  return {
    users: [],
    update: async (id: string, updates: Partial<PresenceSchema>) => {
      SocketAPI.sendRESTMessage(`/presense/${id}`, 'PUT', updates);
    },
  };
});

// Convert the Zustand JS store to Zustand React Store
export const usePresenceStore = createReact(PresenceStore);

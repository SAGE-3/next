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
import { RoomSchema } from '@sage3/shared/types';

// The observable websocket and HTTP
import { APIHttp } from '../api';
import { SocketAPI } from '../utils';
import { SBDocument } from '@sage3/sagebase';

interface RoomState {
  rooms: SBDocument<RoomSchema>[];
  create: (newRoom: RoomSchema) => Promise<void>;
  update: (id: string, updates: Partial<RoomSchema>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  subscribeToAllRooms: () => Promise<void>;
}

/**
 * The RoomStore.
 */
const RoomStore = createVanilla<RoomState>((set, get) => {
  let roomSub: (() => void) | null = null;
  return {
    rooms: [],
    create: async (newRoom: RoomSchema) => {
      SocketAPI.sendRESTMessage(`/api/rooms/`, 'POST', newRoom);
    },
    update: async (id: string, updates: Partial<RoomSchema>) => {
      SocketAPI.sendRESTMessage(`/api/rooms/${id}`, 'PUT', updates);
    },
    delete: async (id: string) => {
      SocketAPI.sendRESTMessage(`/api/rooms/${id}`, 'DELETE');
    },
    subscribeToAllRooms: async () => {
      const rooms = await APIHttp.GET<RoomSchema>('/api/rooms');
      if (rooms.success) {
        set({ rooms: rooms.data });
      }
      // Unsubscribe old subscription
      if (roomSub) {
        roomSub();
        roomSub = null;
      }

      // Socket Subscribe Message
      const route = '/api/rooms';
      // Socket Listenting to updates from server about the current rooms
      roomSub = await SocketAPI.subscribe<RoomSchema>(route, (message) => {
        const doc = message.doc as SBDocument<RoomSchema>;
        switch (message.type) {
          case 'CREATE': {
            set({ rooms: [...get().rooms, doc] });
            break;
          }
          case 'UPDATE': {
            const rooms = [...get().rooms];
            const idx = rooms.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              rooms[idx] = doc;
            }
            set({ rooms: rooms });
            break;
          }
          case 'DELETE': {
            const rooms = [...get().rooms];
            const idx = rooms.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              rooms.splice(idx, 1);
            }
            set({ rooms: rooms });
          }
        }
      });
    },
  };
});


// Convert the Zustand JS store to Zustand React Store
export const useRoomStore = createReact(RoomStore);

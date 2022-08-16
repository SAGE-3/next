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
import { Room, RoomSchema } from '@sage3/shared/types';

// The observable websocket and HTTP
import { APIHttp, SocketAPI } from '../api';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

interface RoomState {
  rooms: Room[];
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
      SocketAPI.sendRESTMessage(`/rooms/`, 'POST', newRoom);
    },
    update: async (id: string, updates: Partial<RoomSchema>) => {
      SocketAPI.sendRESTMessage(`/rooms/${id}`, 'PUT', updates);
    },
    delete: async (id: string) => {
      SocketAPI.sendRESTMessage(`/rooms/${id}`, 'DELETE');
    },
    subscribeToAllRooms: async () => {
      const rooms = await APIHttp.GET<RoomSchema, Room>('/rooms');
      if (rooms.success) {
        set({ rooms: rooms.data });
      }
      // Unsubscribe old subscription
      if (roomSub) {
        roomSub();
        roomSub = null;
      }

      // Socket Subscribe Message
      const route = '/rooms';
      // Socket Listenting to updates from server about the current rooms
      roomSub = await SocketAPI.subscribe<RoomSchema>(route, (message) => {
        const doc = message.doc as Room;
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

// Add Dev tools
if (process.env.NODE_ENV === 'development')  mountStoreDevtool('RoomStore', useRoomStore);

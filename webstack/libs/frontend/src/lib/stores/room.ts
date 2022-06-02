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
import { RoomHTTPService } from '../api';
import { SocketAPI } from '../utils';

interface RoomState {
  rooms: RoomSchema[];
  create: (name: RoomSchema['name'], description: RoomSchema['description']) => Promise<void>;
  update: (id: RoomSchema['id'], updates: Partial<RoomSchema>) => Promise<void>;
  delete: (id: RoomSchema['id']) => Promise<void>;
  subscribeToAllRooms: () => Promise<void>;
}

/**
 * The RoomStore.
 */
const RoomStore = createVanilla<RoomState>((set, get) => {
  const socket = SocketAPI.getInstance();
  let roomSub: (() => void) | null;
  return {
    currentRoom: undefined,
    rooms: [],
    create: async (name: RoomSchema['name'], description: RoomSchema['description']) => {
      RoomHTTPService.create(name, description);
    },
    update: async (id: RoomSchema['id'], updates: Partial<RoomSchema>) => {
      RoomHTTPService.update(id, updates);
    },
    delete: async (id: RoomSchema['id']) => {
      RoomHTTPService.del(id);
    },
    subscribeToAllRooms: async () => {
      const rooms = await RoomHTTPService.readAll();
      if (rooms) {
        set({ rooms });
      }
      if (roomSub) {
        roomSub();
        roomSub = null;
      }

      // Socket Subscribe Message
      const route = '/api/room/subscribe';
      const body = {}
      // Socket Listenting to updates from server about the current user
      roomSub = socket.subscribe<RoomSchema>(route, body, (message) => {
        console.log(message)
        switch (message.type) {
          case 'CREATE': {
            set({ rooms: [...get().rooms, message.doc.data] });
            break;
          }
          case 'UPDATE': {
            const rooms = [...get().rooms];
            const idx = rooms.findIndex((el) => el.id === message.doc.data.id);
            if (idx > -1) {
              rooms[idx] = message.doc.data;
            }
            set({ rooms: rooms });
            break;
          }
          case 'DELETE': {
            const rooms = [...get().rooms];
            const idx = rooms.findIndex((el) => el.id === message.doc.data.id);
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

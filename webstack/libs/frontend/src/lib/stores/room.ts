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
import { Room, RoomSchema } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

// The observable websocket and HTTP
import { APIHttp, SocketAPI } from '../api';

interface RoomState {
  rooms: Room[];
  error: string | null;
  fetched: boolean;
  clearError: () => void;
  create: (newRoom: RoomSchema) => Promise<void>;
  update: (id: string, updates: Partial<RoomSchema>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  subscribeToAllRooms: () => Promise<void>;
}

/**
 * The RoomStore.
 */
const RoomStore = create<RoomState>()((set, get) => {
  let roomSub: (() => void) | null = null;
  return {
    rooms: [],
    error: null,
    fetched: false,
    clearError: () => {
      set({ error: null });
    },
    create: async (newRoom: RoomSchema) => {
      if (!SAGE3Ability.canCurrentUser('create', 'rooms')) return;
      const res = await SocketAPI.sendRESTMessage(`/rooms/`, 'POST', newRoom);
      if (!res.success) {
        set({ error: res.message });
      }
    },
    update: async (id: string, updates: Partial<RoomSchema>) => {
      if (!SAGE3Ability.canCurrentUser('update', 'rooms')) return;
      const res = await SocketAPI.sendRESTMessage(`/rooms/${id}`, 'PUT', updates);
      if (!res.success) {
        set({ error: res.message });
      }
    },
    delete: async (id: string) => {
      if (!SAGE3Ability.canCurrentUser('delete', 'rooms')) return;
      const res = await SocketAPI.sendRESTMessage(`/rooms/${id}`, 'DELETE');
      if (!res.success) {
        set({ error: res.message });
      }
      // TO DO Delete all boards belonging to the room
    },
    subscribeToAllRooms: async () => {
      if (!SAGE3Ability.canCurrentUser('read', 'rooms')) return;
      set({ ...get(), rooms: [], fetched: false });

      const rooms = await APIHttp.GET<Room>('/rooms');
      if (rooms.success) {
        set({ rooms: rooms.data, fetched: true });
      } else {
        set({ error: rooms.message });
        return;
      }
      // Unsubscribe old subscription
      if (roomSub) {
        roomSub();
        roomSub = null;
      }

      // Socket Subscribe Message
      const route = '/rooms';
      // Socket Listenting to updates from server about the current rooms
      roomSub = await SocketAPI.subscribe<Room>(route, (message) => {
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc as Room[];
            set({ rooms: [...get().rooms, ...docs] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc as Room[];
            const rooms = [...get().rooms];
            docs.forEach((doc) => {
              const idx = rooms.findIndex((el) => el._id === doc._id);
              if (idx > -1) {
                rooms[idx] = doc;
              }
            });
            set({ rooms });
            break;
          }
          case 'DELETE': {
            const docs = message.doc as Room[];
            const ids = docs.map((d) => d._id);
            const rooms = [...get().rooms];
            const remainingRooms = rooms.filter((a) => !ids.includes(a._id));
            set({ rooms: remainingRooms });
          }
        }
      });
    },
  };
});

// Export the Zustand store
export const useRoomStore = RoomStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('RoomStore', useRoomStore);

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
import { RoomSchema, RoomWS } from '@sage3/shared/types';

// The observable websocket and HTTP
import { RoomHTTPService } from "../api";
import { SocketAPI } from "../utils";



interface RoomState {
  currentRoom: RoomSchema | undefined;
  rooms: RoomSchema[];
  createRoom: (name: RoomSchema['name'], description: RoomSchema['description']) => void;
  updateName: (id: RoomSchema['id'], name: RoomSchema['name']) => void;
  updateDescription: (id: RoomSchema['id'], email: RoomSchema['description']) => void;
  updateColor: (id: RoomSchema['id'], color: RoomSchema['color']) => void;
  updateOwnerId: (id: RoomSchema['id'], ownerId: RoomSchema['ownerId']) => void;
  updateIsPrivate: (id: RoomSchema['id'], userRole: RoomSchema['isPrivate']) => void;
  deleteRoom: (id: RoomSchema['id']) => void;
  subscribeToAllRooms: () => void;
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
    createRoom(name: RoomSchema['name'], description: RoomSchema['description']) {
      RoomHTTPService.createRoom(name, description);
    },
    updateName(id: RoomSchema['id'], name: RoomSchema['name']) {
      RoomHTTPService.updateName(id, name);
    },
    updateDescription(id: RoomSchema['id'], email: RoomSchema['description']) {
      RoomHTTPService.updateDescription(id, email);
    },
    updateColor(id: RoomSchema['id'], color: RoomSchema['color']) {
      RoomHTTPService.updateColor(id, color);
    },
    updateOwnerId(id: RoomSchema['id'], ownerId: RoomSchema['ownerId']) {
      RoomHTTPService.updateOwnerId(id, ownerId);
    },
    updateIsPrivate(id: RoomSchema['id'], isPrivate: RoomSchema['isPrivate']) {
      RoomHTTPService.updateIsPrivate(id, isPrivate);
    },
    deleteRoom: (id: RoomSchema['id']) => {
      RoomHTTPService.deleteRoom(id);
    },
    subscribeToAllRooms: async () => {
      const rooms = await RoomHTTPService.readAllRooms();
      if (rooms) {
        set({ rooms })
      }
      if (roomSub) {
        roomSub();
        roomSub = null;
      }
      // Socket Subscribe Message
      const message = {
        type: 'sub',
        route: '/api/room/subscribe/all',
      } as RoomWS.AllRoomsSub;

      // Socket Listenting to updates from server about the current user
      roomSub = socket.subscribe<RoomSchema>(message, (message) => {
        switch (message.type) {
          case 'CREATE': {
            set({ rooms: [...get().rooms, message.doc.data] })
            break;
          }
          case 'UPDATE': {
            const rooms = [...get().rooms];
            const idx = rooms.findIndex(el => el.id === message.doc.data.id);
            if (idx > -1) {
              rooms[idx] = message.doc.data;
            }
            set({ rooms: rooms })
            break;
          }
          case 'DELETE': {
            const rooms = [...get().rooms];
            const idx = rooms.findIndex(el => el.id === message.doc.data.id);
            if (idx > -1) {
              rooms.splice(idx, 1);
            }
            set({ rooms: rooms })
          }
        }
      });
    }
  }
})

// Convert the Zustand JS store to Zustand React Store
export const useRoomStore = createReact(RoomStore);

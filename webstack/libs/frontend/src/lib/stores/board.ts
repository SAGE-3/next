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
import { BoardSchema, RoomSchema, UserSchema } from '@sage3/shared/types';

// The observable websocket and HTTP
import { BoardHTTPService } from "../api";
import { SocketAPI } from "../utils";
import { AppSchema } from "@sage3/applications/schema";

interface BoardState {
  boards: BoardSchema[];
  create: (name: BoardSchema['name'], description: BoardSchema['description'], roomId: BoardSchema['roomId']) => void;
  update: (id: BoardSchema['id'], updates: Partial<BoardSchema>) => void;
  delete: (id: BoardSchema['id']) => void;
  subscribeByRoomId: (id: BoardSchema['roomId']) => Promise<void>;
}

/**
 * The BoardStore.
 */
const BoardStore = createVanilla<BoardState>((set, get) => {
  let boardsSub: (() => void) | null = null;
  return {
    boards: [],
    create(name: BoardSchema['name'], description: BoardSchema['description'], roomId: BoardSchema['roomId']) {
      SocketAPI.sendRESTMessage('/api/boards', 'POST', { name, description, roomId });
    },
    update(id: BoardSchema['id'], updates: Partial<BoardSchema>) {
      SocketAPI.sendRESTMessage(`/api/boards/${id}`, 'PUT', updates);
    },
    delete: (id: BoardSchema['id']) => {
      SocketAPI.sendRESTMessage(`/api/boards/${id}`, 'DELETE');
    },
    subscribeByRoomId: async (roomId: BoardSchema['roomId']) => {
      set({ boards: [] })
      const boards = await BoardHTTPService.query({ roomId });
      if (boards) {
        set({ boards })
      }

      // Unsubscribe old subscription
      if (boardsSub) {
        boardsSub();
        boardsSub = null;
      }

      // Socket Subscribe Message
      // Subscribe to the boards with property 'roomId' matching the given id
      const route = `/api/subscription/rooms/${roomId}`;
      // Socket Listenting to updates from server about the current user
      boardsSub = await SocketAPI.subscribe<RoomSchema | BoardSchema | AppSchema>(route, (message) => {
        if (message.col !== 'BOARDS') return;
        const doc = message.doc.data as BoardSchema;
        switch (message.type) {
          case 'CREATE': {
            set({ boards: [...get().boards, doc] })
            break;
          }
          case 'UPDATE': {
            const boards = [...get().boards];
            const idx = boards.findIndex(el => el.id === doc.id);
            if (idx > -1) {
              boards[idx] = doc;
            }
            set({ boards: boards })
            break;
          }
          case 'DELETE': {
            const boards = [...get().boards];
            const idx = boards.findIndex(el => el.id === doc.id);
            if (idx > -1) {
              boards.splice(idx, 1);
            }
            set({ boards: boards })
          }
        }
      });
    }
  }
})


// Convert the Zustand JS store to Zustand React Store
export const useBoardStore = createReact(BoardStore);

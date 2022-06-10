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
import { BoardSchema } from '@sage3/shared/types';

// The observable websocket and HTTP
import { BoardHTTPService } from "../api";
import { SocketAPI } from "../utils";

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
      BoardHTTPService.create(name, description, roomId);
    },
    update(id: BoardSchema['id'], updates: Partial<BoardSchema>) {
      BoardHTTPService.update(id, updates);
    },
    delete: (id: BoardSchema['id']) => {
      BoardHTTPService.del(id);
    },
    subscribeByRoomId: async (roomId: BoardSchema['roomId']) => {
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
      const route = `/api/boards/subscribe/room/${roomId}`
      // Socket Listenting to updates from server about the current user
      boardsSub = await SocketAPI.subscribe<BoardSchema>(route, (message) => {
        switch (message.type) {
          case 'CREATE': {
            set({ boards: [...get().boards, message.doc.data] })
            break;
          }
          case 'UPDATE': {
            const boards = [...get().boards];
            const idx = boards.findIndex(el => el.id === message.doc.data.id);
            if (idx > -1) {
              boards[idx] = message.doc.data;
            }
            set({ boards: boards })
            break;
          }
          case 'DELETE': {
            const boards = [...get().boards];
            const idx = boards.findIndex(el => el.id === message.doc.data.id);
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

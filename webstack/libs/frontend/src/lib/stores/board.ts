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
import { BoardSchema, RoomSchema } from '@sage3/shared/types';

// The observable websocket and HTTP
import { APIHttp } from "../api";
import { SocketAPI } from "../utils";
import { AppSchema } from "@sage3/applications/schema";
import { SBDocument } from "@sage3/sagebase";

interface BoardState {
  boards: SBDocument<BoardSchema>[];
  create: (newBoard: BoardSchema) => void;
  update: (id: string, updates: Partial<BoardSchema>) => void;
  delete: (id: string) => void;
  subscribeByRoomId: (id: BoardSchema['roomId']) => Promise<void>;
}

/**
 * The BoardStore.
 */
const BoardStore = createVanilla<BoardState>((set, get) => {
  let boardsSub: (() => void) | null = null;
  return {
    boards: [],
    create(newBoard: BoardSchema) {
      SocketAPI.sendRESTMessage('/boards', 'POST', newBoard);
    },
    update(id: string, updates: Partial<BoardSchema>) {
      SocketAPI.sendRESTMessage(`/boards/${id}`, 'PUT', updates);
    },
    delete: (id: string) => {
      SocketAPI.sendRESTMessage(`/boards/${id}`, 'DELETE');
    },
    subscribeByRoomId: async (roomId: BoardSchema['roomId']) => {
      set({ boards: [] })
      const boards = await APIHttp.GET<BoardSchema>('/boards', { roomId });
      if (boards.success) {
        set({ boards: boards.data })
      }

      // Unsubscribe old subscription
      if (boardsSub) {
        boardsSub();
        boardsSub = null;
      }

      // Socket Subscribe Message
      // Subscribe to the boards with property 'roomId' matching the given id
      const route = `/subscription/rooms/${roomId}`;
      // Socket Listenting to updates from server about the current user
      boardsSub = await SocketAPI.subscribe<RoomSchema | BoardSchema | AppSchema>(route, (message) => {
        if (message.col !== 'BOARDS') return;
        const doc = message.doc as SBDocument<BoardSchema>;
        switch (message.type) {
          case 'CREATE': {
            set({ boards: [...get().boards, doc] })
            break;
          }
          case 'UPDATE': {
            const boards = [...get().boards];
            const idx = boards.findIndex(el => el._id === doc._id);
            if (idx > -1) {
              boards[idx] = doc;
            }
            set({ boards: boards })
            break;
          }
          case 'DELETE': {
            const boards = [...get().boards];
            const idx = boards.findIndex(el => el._id === doc._id);
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

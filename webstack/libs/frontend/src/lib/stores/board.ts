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
import { Board, BoardSchema, RoomSchema } from '@sage3/shared/types';

// The observable websocket and HTTP
import { APIHttp, SocketAPI } from '../api';
import { AppSchema } from '@sage3/applications/schema';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

interface BoardState {
  boards: Board[];
  error: string | null;
  clearError: () => void;
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
    error: null,
    clearError: () => {
      set({ error: null });
    },
    create: async (newBoard: BoardSchema) => {
      const res = await SocketAPI.sendRESTMessage('/boards', 'POST', newBoard);
      if (!res.success) {
        set({ error: res.message });
      }
    },
    update: async (id: string, updates: Partial<BoardSchema>) => {
      const res = await SocketAPI.sendRESTMessage(`/boards/${id}`, 'PUT', updates);
      if (!res.success) {
        set({ error: res.message });
      }
    },
    delete: async (id: string) => {
      const res = await SocketAPI.sendRESTMessage(`/boards/${id}`, 'DELETE');
      if (!res.success) {
        set({ error: res.message });
      }
    },
    subscribeByRoomId: async (roomId: BoardSchema['roomId']) => {
      set({ boards: [] });
      const boards = await APIHttp.GET<BoardSchema, Board>('/boards', { roomId });
      if (boards.success) {
        set({ boards: boards.data });
      } else {
        set({ error: boards.message });
        return;
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
        const doc = message.doc as Board;
        switch (message.type) {
          case 'CREATE': {
            set({ boards: [...get().boards, doc] });
            break;
          }
          case 'UPDATE': {
            const boards = [...get().boards];
            const idx = boards.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              boards[idx] = doc;
            }
            set({ boards: boards });
            break;
          }
          case 'DELETE': {
            const boards = [...get().boards];
            const idx = boards.findIndex((el) => el._id === doc._id);
            if (idx > -1) {
              boards.splice(idx, 1);
            }
            set({ boards: boards });
          }
        }
      });
    },
  };
});

// Convert the Zustand JS store to Zustand React Store
export const useBoardStore = createReact(BoardStore);

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('BoardStore', useBoardStore);

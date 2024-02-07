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
import { Board, BoardSchema } from '@sage3/shared/types';
import { SAGE3Ability } from '@sage3/shared';

// The observable websocket and HTTP
import { APIHttp, SocketAPI } from '../api';

interface BoardState {
  boards: Board[];
  error: string | null;
  fetched: boolean;
  clearError: () => void;
  create: (newBoard: BoardSchema) => Promise<Board | undefined>;
  update: (id: string, updates: Partial<BoardSchema>) => void;
  delete: (id: string) => void;
  subscribeToAllBoards: () => Promise<void>;
  subscribeByRoomId: (id: BoardSchema['roomId']) => Promise<void>;
}

/**
 * The BoardStore.
 */
const BoardStore = create<BoardState>()((set, get) => {
  let boardsSub: (() => void) | null = null;
  return {
    boards: [],
    error: null,
    fetched: false,
    clearError: () => {
      set({ error: null });
    },
    create: async (newBoard: BoardSchema) => {
      if (!SAGE3Ability.canCurrentUser('create', 'boards')) return;
      const res = await SocketAPI.sendRESTMessage('/boards', 'POST', newBoard);
      if (!res.success) {
        set({ error: res.message });
        return undefined;
      } else {
        return res.data;
      }
    },
    update: async (id: string, updates: Partial<BoardSchema>) => {
      if (!SAGE3Ability.canCurrentUser('update', 'boards')) return;
      const res = await SocketAPI.sendRESTMessage(`/boards/${id}`, 'PUT', updates);
      if (!res.success) {
        set({ error: res.message });
      }
    },
    delete: async (id: string) => {
      if (!SAGE3Ability.canCurrentUser('delete', 'boards')) return;
      const res = await SocketAPI.sendRESTMessage(`/boards/${id}`, 'DELETE');
      if (!res.success) {
        set({ error: res.message });
      }
      // TO DO Delete all apps belonging to the board
    },
    subscribeToAllBoards: async () => {
      if (!SAGE3Ability.canCurrentUser('read', 'boards')) return;
      set({ boards: [], fetched: false });
      const boards = await APIHttp.GET<Board>('/boards');
      if (boards.success) {
        set({ boards: boards.data, fetched: true });
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
      // const route = `/subscription/rooms/${roomId}`;
      const route = `/boards`;
      // Socket Listenting to updates from server about the current board
      boardsSub = await SocketAPI.subscribe<Board>(route, (message) => {
        if (message.col !== 'BOARDS') return;
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc as Board[];
            set({ boards: [...get().boards, ...docs] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc as Board[];
            const boards = [...get().boards];
            docs.forEach((doc) => {
              const idx = boards.findIndex((el) => el._id === doc._id);
              if (idx > -1) {
                boards[idx] = doc;
              }
            });
            set({ boards });
            break;
          }
          case 'DELETE': {
            const docs = message.doc as Board[];
            const ids = docs.map((d) => d._id);
            const boards = [...get().boards];
            const remainingBoards = boards.filter((a) => !ids.includes(a._id));
            set({ boards: remainingBoards });
          }
        }
      });
    },
    subscribeByRoomId: async (roomId: BoardSchema['roomId']) => {
      if (!SAGE3Ability.canCurrentUser('read', 'boards')) return;
      set({ boards: [], fetched: false });
      const boards = await APIHttp.QUERY<Board>('/boards', { roomId });
      if (boards.success) {
        set({ boards: boards.data, fetched: true });
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
      // const route = `/subscription/rooms/${roomId}`;
      const route = `/boards?roomId=${roomId}`;
      // Socket Listenting to updates from server about the current board
      boardsSub = await SocketAPI.subscribe<Board>(route, (message) => {
        if (message.col !== 'BOARDS') return;
        switch (message.type) {
          case 'CREATE': {
            const docs = message.doc as Board[];
            set({ boards: [...get().boards, ...docs] });
            break;
          }
          case 'UPDATE': {
            const docs = message.doc as Board[];
            const boards = [...get().boards];
            docs.forEach((doc) => {
              const idx = boards.findIndex((el) => el._id === doc._id);
              if (idx > -1) {
                boards[idx] = doc;
              }
            });
            set({ boards });
            break;
          }
          case 'DELETE': {
            const docs = message.doc as Board[];
            const ids = docs.map((d) => d._id);
            const boards = [...get().boards];
            const remainingBoards = boards.filter((a) => !ids.includes(a._id));
            set({ boards: remainingBoards });
          }
        }
      });
    },
  };
});

// Export the Zustand store
export const useBoardStore = BoardStore;

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('BoardStore', useBoardStore);

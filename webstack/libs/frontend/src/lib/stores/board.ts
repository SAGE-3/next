/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
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

// SAGE3 Authorization
import { defineAbilityFor, subject, AuthAction } from './auth-model';
// Hooks and stores
import { useUser } from '../hooks';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

interface BoardState {
  boards: Board[];
  error: string | null;
  fetched: boolean;
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
    fetched: false,
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
      // TO DO Delete all apps belonging to the board
    },
    subscribeByRoomId: async (roomId: BoardSchema['roomId']) => {
      set({ boards: [], fetched: false });
      const boards = await APIHttp.GET<BoardSchema, Board>('/boards', { roomId });
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

/**
 * Hook to use the board store with authorization
 *
 * @export
 * @param {Board} board
 * @returns createBoard, updateBoard, deleteBoard, canBoard
 */
export function useAuthorizationBoardStore(board: Board | undefined) {
  const create = useBoardStore((state) => state.create);
  const update = useBoardStore((state) => state.update);
  const deletion = useBoardStore((state) => state.delete);
  // Get the user information
  const { user } = useUser();

  // Permissions
  const ability = defineAbilityFor(user ? user.data.userRole : 'guest', user?._id);

  function createBoard(newBoard: BoardSchema) {
    if (ability.can('create', 'board')) {
      create(newBoard);
    }
  }

  function updateBoard(id: string, updates: Partial<BoardSchema>) {
    if (!board) return;
    if (ability.can('modify', subject('board', { ownerId: board._createdBy }))) {
      update(id, updates);
    }
  }

  function deleteBoard(id: string) {
    if (!board) return;
    if (ability.can('delete', subject('board', { ownerId: board._createdBy }))) {
      deletion(id);
    }
  }

  function canBoard(operation: AuthAction) {
    if (operation === 'create') return ability.can(operation, 'board');
    if (!board) return false;
    return ability.can(operation, subject('board', { ownerId: board._createdBy }));
  }

  return { createBoard, updateBoard, deleteBoard, canBoard };
}

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('BoardStore', useBoardStore);

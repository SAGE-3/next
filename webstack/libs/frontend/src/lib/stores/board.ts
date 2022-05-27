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
import { BoardSchema, BoardWS } from '@sage3/shared/types';

// The observable websocket and HTTP
import { BoardHTTPService } from "../api";
import { SocketAPI } from "../utils";

interface BoardState {
  boards: BoardSchema[];
  createBoard: (name: BoardSchema['name'], description: BoardSchema['description'], roomId: BoardSchema['roomId']) => void;
  updateName: (id: BoardSchema['id'], name: BoardSchema['name']) => void;
  updateDescription: (id: BoardSchema['id'], email: BoardSchema['description']) => void;
  updateColor: (id: BoardSchema['id'], color: BoardSchema['color']) => void;
  updateOwnerId: (id: BoardSchema['id'], ownerId: BoardSchema['ownerId']) => void;
  updateRoomId: (id: BoardSchema['id'], roomId: BoardSchema['roomId']) => void;
  updateIsPrivate: (id: BoardSchema['id'], userRole: BoardSchema['isPrivate']) => void;
  deleteBoard: (id: BoardSchema['id']) => void;
  subscribeByRoomId: (id: BoardSchema['roomId']) => Promise<void>;
}

/**
 * The BoardStore.
 */
const BoardStore = createVanilla<BoardState>((set, get) => {
  const socket = SocketAPI.getInstance();
  let boardsSub: (() => void) | null;
  return {
    currentBoard: undefined,
    boards: [],
    createBoard(name: BoardSchema['name'], description: BoardSchema['description'], roomId: BoardSchema['roomId']) {
      BoardHTTPService.createBoard(name, description, roomId);
    },
    updateName(id: BoardSchema['id'], name: BoardSchema['name']) {
      BoardHTTPService.updateName(id, name);
    },
    updateDescription(id: BoardSchema['id'], email: BoardSchema['description']) {
      BoardHTTPService.updateDescription(id, email);
    },
    updateColor(id: BoardSchema['id'], color: BoardSchema['color']) {
      BoardHTTPService.updateColor(id, color);
    },
    updateOwnerId(id: BoardSchema['id'], ownerId: BoardSchema['ownerId']) {
      BoardHTTPService.updateOwnerId(id, ownerId);
    },
    updateRoomId(id: BoardSchema['id'], roomId: BoardSchema['roomId']) {
      BoardHTTPService.updateRoomId(id, roomId);
    },
    updateIsPrivate(id: BoardSchema['id'], isPrivate: BoardSchema['isPrivate']) {
      BoardHTTPService.updateIsPrivate(id, isPrivate);
    },
    deleteBoard: (id: BoardSchema['id']) => {
      BoardHTTPService.deleteBoard(id);
    },
    subscribeByRoomId: async (roomId: BoardSchema['roomId']) => {
      const boards = await BoardHTTPService.readByRoomId(roomId);
      if (boards) {
        set({ boards })
      }
      if (boardsSub) {
        boardsSub();
        boardsSub = null;
      }

      // Socket Subscribe Message
      const message = {
        type: 'sub',
        route: '/api/board/subscribe/roomid',
        body: {
          roomId
        }
      } as BoardWS.ByRoomIdSub;

      // Socket Listenting to updates from server about the current user
      boardsSub = socket.subscribe<BoardSchema>(message, (message) => {
        console.log(message)
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

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The BoardAPI for SAGE3
 * 
 * Flow Diagram
 * ┌──┐  ┌─────┐  ┌─────────┐  ┌───┐
 * │DB│◄─┤Model│◄─┤ Service │◄─┤API│
 * └──┘  └─────┘  └─────────┘  └───┘
 * 
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

// External Imports
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

// App Imports
import { BoardService } from '../../services';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { BoardWS } from '@sage3/shared/types';

/**
 * 
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function boardWSRouter(socket: WebSocket, request: IncomingMessage, message: BoardWS.Message, cache: SubscriptionCache): Promise<void> {
  const auth = request.session.passport.user;

  switch (message.type) {

    case 'post':
      switch (message.route) {
        case '/api/board/create': {
          const m = message as BoardWS.CreateRequest;
          const body = m.body;
          const board = await BoardService.createBoard(body.name, body.description, auth.id, body.roomId);
          const response = {
            ...m,
            body: {
              success: (board) ? true : false,
              board
            }
          } as BoardWS.CreateResponse;
          socket.send(response);
          break;
        }
      }
      break;

    case 'get':
      switch (message.route) {
        case '/api/board/read': {
          const m = message as BoardWS.ReadRequest;
          const body = m.body;
          const board = await BoardService.readBoard(body.id);
          const response = {
            ...m,
            body: {
              success: (board) ? true : false,
              board
            }
          } as BoardWS.ReadResponse;
          socket.send(response);
          break;
        }
        case '/api/board/read/all': {
          const m = message as BoardWS.ReadAllRequest;
          const boards = await BoardService.readAllBoards();
          const response = {
            ...m,
            body: {
              success: (boards) ? true : false,
              boards
            }
          } as BoardWS.ReadAllResponse;
          socket.send(response);
          break;
        }
        case '/api/board/read/roomid': {
          const m = message as BoardWS.ReadByRoomIdRequest;
          const body = m.body;
          const boards = await BoardService.readByRoomId(body.roomId);
          const response = {
            ...m,
            body: {
              success: (boards) ? true : false,
              boards
            }
          } as BoardWS.ReadByRoomIdResponse;
          socket.send(response);
          break;
        }
      }
      break;

    case 'del':
      switch (message.route) {
        case '/api/board/delete': {
          const m = message as BoardWS.DeleteRequest;
          const body = m.body;
          const delReq = await BoardService.deleteBoard(body.id);
          const response = {
            ...m,
            body: {
              success: delReq
            }
          } as BoardWS.DeleteResponse
          socket.send(response);
          break;
        }
      }
      break;

    case 'sub': {
      switch (message.route) {
        case '/api/board/subscribe': {
          const m = message as BoardWS.BoardSub;
          const body = m.body;
          const sub = await BoardService.subscribeToBoard(body.id, (doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as BoardWS.BoardEvent;
            socket.send(JSON.stringify(event));
          });
          if (sub) {
            cache.add(m.msgId, sub);
          }
          break;
        }
        case '/api/board/subscribe/all': {
          const m = message as BoardWS.AllBoardsSub;
          const sub = await BoardService.subscribetoAllBoards((doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as BoardWS.BoardEvent;
            socket.send(JSON.stringify(event));
          });
          if (sub) {
            cache.add(m.msgId, sub);
          }
          break;
        }
        case '/api/board/subscribe/roomid': {
          const m = message as BoardWS.ByRoomIdSub;
          const body = m.body;
          const sub = await BoardService.subscribeByRoomId(body.roomId, (doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as BoardWS.BoardEvent;
            socket.send(JSON.stringify(event));
          });
          if (sub) {
            cache.add(m.msgId, sub);
          }
          break;
        }
      }
      break;
    }
    case 'unsub': {
      switch (message.route) {
        case '/api/board/unsubscribe': {
          const m = message as BoardWS.Unsub;
          const body = m.body;
          cache.delete(body.subId)
          break;
        }
      }
      break;
    }
  }
}
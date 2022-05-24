/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The AppAPI for SAGE3
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
import { AppService } from '../../services';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { AppWS } from '@sage3/shared/types';

/**
 * 
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function appWSRouter(socket: WebSocket, request: IncomingMessage, message: AppWS.Message, cache: SubscriptionCache): Promise<void> {
  const auth = request.session.passport.user;

  switch (message.type) {

    case 'post':
      switch (message.route) {
        case '/api/app/create': {
          const m = message as AppWS.CreateRequest;
          const body = m.body;
          const app = await AppService.createApp(body.name, body.description, auth.id, body.roomId, body.boardId, body.type, body.state);
          const response = {
            ...m,
            body: {
              success: (app) ? true : false,
              app
            }
          } as AppWS.CreateResponse;
          socket.send(response);
          break;
        }
      }
      break;

    case 'get':
      switch (message.route) {
        case '/api/app/read': {
          const m = message as AppWS.ReadRequest;
          const body = m.body;
          const app = await AppService.readApp(body.id);
          const response = {
            ...m,
            body: {
              success: (app) ? true : false,
              app
            }
          } as AppWS.ReadResponse;
          socket.send(response);
          break;
        }
        case '/api/app/read/all': {
          const m = message as AppWS.ReadAllRequest;
          const apps = await AppService.readAllApps();
          const response = {
            ...m,
            body: {
              success: (apps) ? true : false,
              apps
            }
          } as AppWS.ReadAllResponse;
          socket.send(response);
          break;
        }
        case '/api/app/read/roomid': {
          const m = message as AppWS.ReadByRoomIdRequest;
          const body = m.body;
          const apps = await AppService.readByRoomId(body.roomId);
          const response = {
            ...m,
            body: {
              success: (apps) ? true : false,
              apps
            }
          } as AppWS.ReadByRoomIdResponse;
          socket.send(response);
          break;
        }
        case '/api/app/read/boardid': {
          const m = message as AppWS.ReadByBoardIdRequest;
          const body = m.body;
          const apps = await AppService.readByBoardId(body.roomId);
          const response = {
            ...m,
            body: {
              success: (apps) ? true : false,
              apps
            }
          } as AppWS.ReadByBoardIdResponse;
          socket.send(response);
          break;
        }
      }
      break;

    case 'del':
      switch (message.route) {
        case '/api/app/delete': {
          const m = message as AppWS.DeleteRequest;
          const body = m.body;
          const delReq = await AppService.deleteApp(body.id);
          const response = {
            ...m,
            body: {
              success: delReq
            }
          } as AppWS.DeleteResponse
          socket.send(response);
          break;
        }
      }
      break;

    case 'sub': {
      switch (message.route) {
        case '/api/app/subscribe': {
          const m = message as AppWS.AppSub;
          const body = m.body;
          const sub = await AppService.subscribeToApp(body.id, (doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as AppWS.BoardEvent;
            socket.send(JSON.stringify(event));
          });
          if (sub) {
            cache.add(m.msgId, sub);
          }
          break;
        }
        case '/api/app/subscribe/all': {
          const m = message as AppWS.AllAppsSub;
          const sub = await AppService.subscribetoAllApps((doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as AppWS.BoardEvent;
            socket.send(JSON.stringify(event));
          });
          if (sub) {
            cache.add(m.msgId, sub);
          }
          break;
        }
        case '/api/app/subscribe/roomid': {
          const m = message as AppWS.ByRoomIdSub;
          const body = m.body;
          const sub = await AppService.subscribeByRoomId(body.roomId, (doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as AppWS.BoardEvent;
            socket.send(JSON.stringify(event));
          });
          if (sub) {
            cache.add(m.msgId, sub);
          }
          break;
        }
        case '/api/app/subscribe/boardid': {
          const m = message as AppWS.ByBoardIdSub;
          const body = m.body;
          const sub = await AppService.subscribeByBoardId(body.boardId, (doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as AppWS.BoardEvent;
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
        case '/api/app/unsubscribe': {
          const m = message as AppWS.Unsub;
          const body = m.body;
          cache.delete(body.subId)
          break;
        }
      }
      break;
    }
  }
}
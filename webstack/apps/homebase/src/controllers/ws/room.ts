/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The RoomAPI for SAGE3
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
import { RoomService } from '../../services';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { RoomWS } from '@sage3/shared/types';

/**
 * 
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function roomWSRouter(socket: WebSocket, request: IncomingMessage, message: RoomWS.Message, cache: SubscriptionCache): Promise<void> {
  const auth = request.session.passport.user;

  switch (message.type) {
    case 'post': {
      switch (message.route) {
        case '/api/room/create': {
          const m = message as RoomWS.CreateRequest;
          const body = m.body;
          const room = await RoomService.createRoom(body.name, body.description, auth.id);
          const response = {
            ...m,
            body: {
              success: (room) ? true : false,
              room
            }
          } as RoomWS.CreateResponse;
          socket.send(response);
          break;
        }
      }
      break;
    }

    case 'get': {
      switch (message.route) {
        case '/api/room/read': {
          const m = message as RoomWS.ReadRequest;
          const body = m.body;
          const room = await RoomService.readRoom(body.id);
          const response = {
            ...m,
            body: {
              success: (room) ? true : false,
              room
            }
          } as RoomWS.ReadResponse;
          socket.send(response);
          break;
        }
        case '/api/room/read/all': {
          const m = message as RoomWS.ReadAllRequest;
          const rooms = await RoomService.readAllRooms();
          const response = {
            ...m,
            body: {
              success: (rooms) ? true : false,
              rooms
            }
          } as RoomWS.ReadAllResponse;
          socket.send(response);
          break;
        }
      }
      break;
    }
    case 'del': {
      switch (message.route) {
        case '/api/room/delete': {
          const m = message as RoomWS.DeleteRequest;
          const body = m.body;
          const delReq = await RoomService.deleteRoom(body.id);
          const response = {
            ...m,
            body: {
              success: delReq
            }
          } as RoomWS.DeleteResponse
          socket.send(response);
          break;
        }
      }
      break;
    }
    case 'sub': {
      switch (message.route) {
        case '/api/room/subscribe': {
          const m = message as RoomWS.RoomSub;
          const body = m.body;
          const sub = await RoomService.subscribeToRoom(body.id, (doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as RoomWS.RoomEvent;
            socket.send(JSON.stringify(event));
          });
          if (sub) {
            cache.add(m.msgId, sub);
          }
          break;
        }
        case '/api/room/subscribe/all': {
          const m = message as RoomWS.AllRoomsSub;
          const sub = await RoomService.subscribeToAllRooms((doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as RoomWS.RoomEvent;
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
        case '/api/room/unsubscribe': {
          const m = message as RoomWS.Unsub;
          const body = m.body;
          cache.delete(body.subId)
          break;
        }
      }
      break;
    }
  }

}

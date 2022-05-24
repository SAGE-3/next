/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The UserAPI for SAGE3
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
import { UserService } from '../../services';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { UserRole, UserWS } from '@sage3/shared/types';


/**
 * User route/api ws router.
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function userWSRouter(socket: WebSocket, request: IncomingMessage, message: UserWS.Message, cache: SubscriptionCache): Promise<void> {
  const auth = request.session.passport.user;

  switch (message.type) {
    case 'post': {
      switch (message.route) {
        case '/api/user/create': {
          const m = message as UserWS.CreateRequest;
          const body = m.body;
          const id = auth.id;
          const role = (auth.provider === 'guest') ? 'guest' as UserRole : 'user' as UserRole;
          const user = await UserService.createUser(id, body.name, body.email, role);
          const response = {
            ...m,
            body: {
              success: (user) ? true : false,
              user
            }
          } as UserWS.CreateResponse;
          socket.send(response);
          break;
        }
      }
      break;
    }

    case 'get': {
      switch (message.route) {
        case '/api/user/read': {
          const m = message as UserWS.ReadRequest;
          const body = m.body;
          const user = await UserService.readUser(body.id);
          const response = {
            ...m,
            body: {
              success: (user) ? true : false,
              user
            }
          } as UserWS.ReadResponse;
          socket.send(response);
          break;
        }
        case '/api/user/read/all': {
          const m = message as UserWS.ReadAllRequest;
          const users = await UserService.readAllUsers();
          const response = {
            ...m,
            body: {
              success: (users) ? true : false,
              users
            }
          } as UserWS.ReadAllResponse;
          socket.send(response);
          break;
        }
        case '/api/user/read/current': {
          const m = message as UserWS.ReadCurrentRequest;
          const user = await UserService.readUser(auth.id);
          const response = {
            ...m,
            body: {
              success: (user) ? true : false,
              user
            }
          } as UserWS.ReadCurrentResponse;
          socket.send(response);
          break;
        }
      }
      break;
    }
    case 'del': {
      switch (message.route) {
        case '/api/user/delete': {
          const m = message as UserWS.DeleteRequest;
          const body = m.body;
          const delReq = await UserService.deleteUser(body.id);
          const response = {
            ...m,
            body: {
              success: delReq
            }
          } as UserWS.DeleteResponse
          socket.send(response);
          break;
        }
      }
      break;
    }
    case 'sub': {
      switch (message.route) {
        case '/api/user/subscribe': {
          const m = message as UserWS.UserSub;
          const body = m.body;
          const sub = await UserService.subscribeToUser(body.id, (doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as UserWS.UserEvent;
            socket.send(JSON.stringify(event));
          });
          if (sub) {
            cache.add(m.msgId, sub);
          }
          break;
        }
        case '/api/user/subscribe/all': {
          const m = message as UserWS.AllUsersSub;
          const sub = await UserService.subscribeToAllUsers((doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as UserWS.UserEvent;
            socket.send(JSON.stringify(event));
          });
          if (sub) {
            cache.add(m.msgId, sub);
          }
          break;
        }
        case '/api/user/subscribe/current': {
          const m = message as UserWS.UserCurrentSub;
          const sub = await UserService.subscribeToUser(auth.id, (doc) => {
            const event = {
              msgId: m.msgId,
              type: 'event',
              event: doc
            } as UserWS.UserEvent;
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
        case '/api/user/unsubscribe': {
          const m = message as UserWS.Unsub;
          const body = m.body;
          cache.delete(body.subId)
          break;
        }
      }
      break;
    }
  }
}

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
import { APIClientWSMessage, UserSchema } from '@sage3/shared/types';

/**
 * User route/api ws router.
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function userWSRouter(socket: WebSocket, request: IncomingMessage, message: APIClientWSMessage, cache: SubscriptionCache): Promise<void> {
  const auth = request.session.passport.user;
  switch (message.method) {
    case 'POST': {
      // CREATE USER
      const body = message.body as Partial<UserSchema>;
      if (body === undefined) {
        socket.send(JSON.stringify({ id: message.id, success: false, message: 'No body provided' }));
        return;
      } else {
        const user = await UserService.create(auth, body);
        if (user) socket.send(JSON.stringify({ id: message.id, success: true, data: user }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to create user.' }));
      }
      break;
    }
    case 'GET': {
      // READ ALL USERS
      if (message.route.startsWith('/api/users')) {
        const users = await UserService.readAll();
        if (users) socket.send(JSON.stringify({ id: message.id, success: true, data: users }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get users.' }));
      }
      // READ ONE USER 
      else if (message.route.startsWith('/api/users/')) {
        const roomId = message.route.split('/').at(-1) as string;
        const room = await UserService.read(roomId);
        if (room) socket.send(JSON.stringify({ id: message.id, success: true, data: room }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get user.' }));
      }
      break;
    }
    // UPDATE USER
    case 'PUT': {
      const userId = message.route.split('/').at(-1) as string;
      const body = message.body as Partial<UserSchema>;
      const update = await UserService.update(userId, body);
      if (update) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to update user.' }));
      break;
    }
    // DELETE USER
    case 'DELETE': {
      const userId = message.route.split('/').at(-1) as string;
      const del = await UserService.delete(userId);
      if (del) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to delete user.' }));
      break;
    }
    case 'SUB': {
      // Subscribe to all users
      if (message.route.startsWith('/api/users')) {
        const sub = await UserService.subscribeAll((doc) => {
          const msg = { id: message.id, event: doc }
          socket.send(JSON.stringify(msg));
        });
        if (sub) cache.add(message.id, [sub])
      }
      // Subscribe to one user
      else if (message.route.startsWith('/api/users/')) {
        const id = message.route.split('/').at(-1);
        if (!id) return;
        const sub = await UserService.subscribe(id, (doc) => {
          const msg = { id: message.id, event: doc }
          socket.send(JSON.stringify(msg));
        });
        if (sub) cache.add(message.id, [sub])
      }
      break;
    }
    case 'UNSUB': {
      // Unsubscribe Message
      cache.delete(message.id);
      break;
    }
    default: {
      socket.send(JSON.stringify({ id: message.id, success: false, message: 'Invalid method.' }));
    }

  }
}

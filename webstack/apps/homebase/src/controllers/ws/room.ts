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
import { APIClientWSMessage, RoomSchema } from '@sage3/shared/types';

/**
 * 
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function roomWSRouter(socket: WebSocket, request: IncomingMessage, message: APIClientWSMessage, cache: SubscriptionCache): Promise<void> {
  const auth = request.session.passport.user;
  switch (message.method) {
    case 'POST': {
      // CREATE ROOM
      const body = message.body as Partial<RoomSchema>;
      if (body === undefined) {
        socket.send(JSON.stringify({ id: message.id, success: false, message: 'No body provided' }));
        return;
      } else {
        const room = await RoomService.create(auth.id, body);
        if (room) socket.send(JSON.stringify({ id: message.id, success: true, data: room }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to create room.' }));
      }
      break;
    }
    case 'GET': {
      // READ ALL ROOMS
      if (message.route.startsWith('/api/rooms')) {
        const rooms = await RoomService.readAll();
        if (rooms) socket.send(JSON.stringify({ id: message.id, success: true, data: rooms }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get rooms.' }));
      }
      // READ ONE ROOM 
      else if (message.route.startsWith('/api/rooms/')) {
        const roomId = message.route.split('/').at(-1) as string;
        const room = await RoomService.read(roomId);
        if (room) socket.send(JSON.stringify({ id: message.id, success: true, data: room }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get room.' }));
      }
      break;
    }
    // UPDATE BOARD
    case 'PUT': {
      const boardId = message.route.split('/').at(-1) as string;
      const body = message.body as Partial<RoomSchema>;
      const update = await RoomService.update(boardId, body);
      if (update) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to update room.' }));
      break;
    }
    // DELETE BOARD
    case 'DELETE': {
      const roomId = message.route.split('/').at(-1) as string;
      const del = await RoomService.delete(roomId);
      if (del) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to delete room.' }));
      break;
    }
    case 'SUB': {
      // Subscribe to all boards
      if (message.route.startsWith('/api/rooms')) {
        const sub = await RoomService.subscribeAll((doc) => {
          const msg = { id: message.id, event: doc }
          socket.send(JSON.stringify(msg));
        });
        if (sub) cache.add(message.id, [sub])
      }
      // Subscribe to one board
      else if (message.route.startsWith('/api/rooms/')) {
        const id = message.route.split('/').at(-1);
        if (!id) {
          socket.send(JSON.stringify({ id: message.id, success: false, message: 'No id provided' }));
          return;
        }
        const sub = await RoomService.subscribe(id, (doc) => {
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

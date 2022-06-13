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
import { APIClientWSMessage, BoardSchema } from '@sage3/shared/types';


/**
 * 
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function boardWSRouter(socket: WebSocket, request: IncomingMessage, message: APIClientWSMessage, cache: SubscriptionCache): Promise<void> {
  const auth = request.session.passport.user;
  switch (message.method) {
    case 'POST': {
      // CREATE BOARD
      const body = message.body as Partial<BoardSchema>;
      if (body === undefined) {
        socket.send(JSON.stringify({ id: message.id, success: false, message: 'No body provided' }));
        return;
      } else {
        const board = await BoardService.create(auth.id, body);
        if (board) socket.send(JSON.stringify({ id: message.id, success: true, data: board }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to create board.' }));
      }
      break;
    }
    case 'GET': {
      // READ ALL BOARDS
      if (message.route.startsWith('/api/boards')) {
        const boards = await BoardService.readAll();
        if (boards) socket.send(JSON.stringify({ id: message.id, success: true, data: boards }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get boards.' }));
      }
      // READ ONE BOARD 
      else if (message.route.startsWith('/api/boards/')) {
        const boardId = message.route.split('/').at(-1) as string;
        const board = await BoardService.read(boardId);
        if (board) socket.send(JSON.stringify({ id: message.id, success: true, data: board }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get board.' }));
      }
      break;
    }
    // UPDATE BOARD
    case 'PUT': {
      const boardId = message.route.split('/').at(-1) as string;
      const body = message.body as Partial<BoardSchema>;
      const update = await BoardService.update(boardId, body);
      if (update) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to update board.' }));
      break;
    }
    // DELETE BOARD
    case 'DELETE': {
      const boardId = message.route.split('/').at(-1) as string;
      const del = await BoardService.delete(boardId);
      if (del) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to delete board.' }));
      break;
    }
    case 'SUB': {
      // Subscribe to all boards
      if (message.route.startsWith('/api/boards')) {
        const sub = await BoardService.subscribeAll((doc) => {
          const msg = { id: message.id, event: doc }
          socket.send(JSON.stringify(msg));
        });
        if (sub) cache.add(message.id, [sub])
      }
      // Subscribe to one board
      else if (message.route.startsWith('/api/boards/')) {
        const id = message.route.split('/').at(-1);
        if (!id) {
          socket.send(JSON.stringify({ id: message.id, success: false, message: 'No id provided' }));
          return;
        }
        const sub = await BoardService.subscribe(id, (doc) => {
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
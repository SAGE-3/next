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
import { APIClientWSMessage } from '@sage3/shared/types';
import { genId } from '@sage3/shared';


/**
 * 
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function boardWSRouter(socket: WebSocket, request: IncomingMessage, message: APIClientWSMessage, cache: SubscriptionCache): Promise<void> {
  // Subscribe Message by Property Value (roomId)
  if (message.route.startsWith('/api/boards/subscribe/room/')) {
    const roomId = message.route.split('/').at(-1);
    if (!roomId) return;
    const sub = await BoardService.subscribeByRoomId(roomId, (doc) => {
      const msg = { id: genId(), subId: message.subId, event: doc }
      socket.send(JSON.stringify(msg));
    });
    if (sub) cache.add(message.subId, sub)
  }
  else if (message.route.startsWith('/api/boards/subscribe')) {
    // Subscribe All
    if (message.route === '/api/boards/subscribe') {
      const sub = await BoardService.subscribetoAllBoards((doc) => {
        const msg = { id: genId(), subId: message.subId, event: doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.subId, sub)
    }
    // Subscribe To One
    else {
      const id = message.route.split('/').at(-1);
      if (!id) return;
      const sub = await BoardService.subscribeToBoard(id, (doc) => {
        const msg = { id: genId(), subId: message.subId, event: doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.subId, sub)
    }
  }
  // Unsubscribe Message
  else if (message.route.startsWith('/api/boards/unsubscribe')) {
    cache.delete(message.subId);
  }
}
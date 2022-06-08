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

  switch (message.route) {
    case '/api/boards/subscribe': {
      const sub = await BoardService.subscribetoAllBoards((doc) => {
        const msg = { id: genId(), subId: message.body.subId, event: doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.body.subId, sub)
      break;
    }
    case '/api/boards/subscribe/:id': {
      const sub = await BoardService.subscribeToBoard(message.body.id, (doc) => {
        const msg = { id: genId(), subId: message.body.subId, event: doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.body.subId, sub)
      break;
    }
    case '/api/boards/subscribe/:roomId': {
      const sub = await BoardService.subscribeByRoomId(message.body.roomId, (doc) => {
        const msg = { id: genId(), subId: message.body.subId, event: doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.body.subId, sub)
      break;
    }
    case '/api/boards/unsubscribe': {
      cache.delete(message.body.subId)
      break;
    }
  }
}
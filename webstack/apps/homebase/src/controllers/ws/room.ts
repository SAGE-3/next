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
import { APIClientWSMessage } from '@sage3/shared/types';
import { genId } from '@sage3/shared';

/**
 * 
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function roomWSRouter(socket: WebSocket, request: IncomingMessage, message: APIClientWSMessage, cache: SubscriptionCache): Promise<void> {
  switch (message.route) {
    case '/api/room/subscribe': {
      const sub = await RoomService.subscribeToAllRooms((doc) => {
        const msg = { id: genId(), subId: message.body.subId, doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.body.subId, sub)
      break;
    }
    case '/api/room/subscribe/:id': {
      const sub = await RoomService.subscribeToRoom(message.body.id, (doc) => {
        const msg = { id: genId(), subId: message.body.subId, doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.body.subId, sub)
      break;
    }
    case '/api/room/unsubscribe': {
      cache.delete(message.body.subId)
      break;
    }
  }

}

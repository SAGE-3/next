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
import { genId } from '@sage3/shared';
import { APIClientWSMessage } from '@sage3/shared/types';

/**
 * 
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function appWSRouter(socket: WebSocket, request: IncomingMessage, message: APIClientWSMessage, cache: SubscriptionCache): Promise<void> {

  switch (message.route) {
    case '/api/app/subscribe': {
      const sub = await AppService.subscribeToAllApps((doc) => {
        const msg = { id: genId(), subId: message.body.subId, doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.body.subId, sub)
      break;
    }
    case '/api/app/subscribe/:id': {
      const sub = await AppService.subscribeToApp(message.body.id, (doc) => {
        const msg = { id: genId(), subId: message.body.subId, doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.body.subId, sub)
      break;
    }
    case '/api/app/subscribe/:roomId': {
      const sub = await AppService.subscribeByRoomId(message.body.roomId, (doc) => {
        const msg = { id: genId(), subId: message.body.subId, doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.body.subId, sub)
      break;
    }
    case '/api/app/subscribe/:boardId': {
      const sub = await AppService.subscribeByRoomId(message.body.boardId, (doc) => {
        const msg = { id: genId(), subId: message.body.subId, doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.body.subId, sub)
      break;
    }
    case '/api/app/unsubscribe': {
      cache.delete(message.body.subId)
      break;
    }

  }
}
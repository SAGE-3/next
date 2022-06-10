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
  // Subscribe Message by Property Value (roomId)
  if (message.route.startsWith('/api/apps/subscribebyroomid')) {
    const roomId = message.route.split('/').at(-1);
    if (!roomId) return;
    const sub = await AppService.subscribeByRoomId(roomId, (doc) => {
      const msg = { id: genId(), subId: message.subId, event: doc }
      socket.send(JSON.stringify(msg));
    });
    if (sub) cache.add(message.subId, sub)
  }
  // Subscribe Message by Property Value (boardId)
  else if (message.route.startsWith('/api/apps/subscribebyboardid')) {
    const boardId = message.route.split('/').at(-1);
    if (!boardId) return;
    const sub = await AppService.subscribeByBoardId(boardId, (doc) => {
      console.log('msg')
      const msg = { id: genId(), subId: message.subId, event: doc }
      socket.send(JSON.stringify(msg));
    });
    if (sub) cache.add(message.subId, sub)
  }
  // Subscribe Message
  if (message.route.startsWith('/api/apps/subscribe')) {
    // Subscribe All
    if (message.route === '/api/apps/subscribe') {
      const sub = await AppService.subscribeToAllApps((doc) => {
        const msg = { id: genId(), subId: message.subId, event: doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.subId, sub)
    }
    // Subscribe To One App
    else {
      const id = message.route.split('/').at(-1);
      if (!id) return;
      const sub = await AppService.subscribeToApp(id, (doc) => {
        const msg = { id: genId(), subId: message.subId, event: doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.subId, sub)
    }
  }
  // Unsubscribe Message
  if (message.route.startsWith('/api/apps/unsubscribe')) {
    cache.delete(message.subId);
  }
}
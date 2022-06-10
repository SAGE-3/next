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
import { APIClientWSMessage } from '@sage3/shared/types';
import { genId } from '@sage3/shared';

/**
 * User route/api ws router.
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function userWSRouter(socket: WebSocket, request: IncomingMessage, message: APIClientWSMessage, cache: SubscriptionCache): Promise<void> {
  // Subscribe Message
  if (message.route.includes('/api/users/subscribe')) {
    // Subscribe All
    if (message.route === '/api/users/subscribe') {
      const sub = await UserService.subscribeToAllUsers((doc) => {
        const msg = { id: genId(), subId: message.subId, event: doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.subId, sub)
    }
    // Subscribe To One
    else {
      const id = message.route.split('/').at(-1);
      if (!id) return;
      const sub = await UserService.subscribeToUser(id, (doc) => {
        const msg = { id: genId(), subId: message.subId, event: doc }
        socket.send(JSON.stringify(msg));
      });
      if (sub) cache.add(message.subId, sub)
    }
  }
  // Unsubscribe Message
  if (message.route.includes('/api/users/unsubscribe')) {
    cache.delete(message.subId);
  }
}

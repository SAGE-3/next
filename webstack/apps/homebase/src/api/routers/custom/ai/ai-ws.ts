/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * AI Websocket Router
 */

// External Imports
import { WebSocket } from 'ws';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { APIClientWSMessage } from '@sage3/shared/types';
import { SBAuthSchema } from '@sage3/sagebase';

/**
 * This class is for CUSTOM SUBSCRIPTIONS
 * @param socket
 * @param request
 * @param message
 * @param cache
 */
export async function AIWSRouter(
  socket: WebSocket,
  message: APIClientWSMessage,
  _user: SBAuthSchema,
  _cache: SubscriptionCache
): Promise<void> {
  console.log('AIWSRouter ~ message.method:', message.method);
  switch (message.method) {
    case 'PUT': {
      socket.send(JSON.stringify({ id: message.id, success: true, data: 'bla bla2' }));
      socket.send(JSON.stringify({ id: message.id, success: true, data: 'bla bla3' }));
      socket.send(JSON.stringify({ id: message.id, success: true, data: 'bla bla1' }));
      break;
    }
    default: {
      socket.send(JSON.stringify({ id: message.id, success: false, message: 'Invalid method.' }));
      break;
    }
  }
}

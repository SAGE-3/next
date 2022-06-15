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
import { AssetModel } from '../../models';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { APIClientWSMessage } from '@sage3/shared/types';

/**
 *
 * @param socket
 * @param request
 * @param message
 * @param cache
 */
export async function assetWSRouter(
  socket: WebSocket,
  request: IncomingMessage,
  message: APIClientWSMessage,
  cache: SubscriptionCache
): Promise<void> {
  // const auth = request.session.passport.user;
  switch (message.method) {
    case 'GET': {
      // READ ALL
      if (message.route.startsWith('/api/assets')) {
        const assets = await AssetModel.getAllAssets();
        if (assets) socket.send(JSON.stringify({ id: message.id, success: true, data: assets }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get assets.' }));
      }
      // READ ONE
      else if (message.route.startsWith('/api/assets/')) {
        const id = message.route.split('/').at(-1) as string;
        const asset = await AssetModel.getAsset(id);
        if (asset) socket.send(JSON.stringify({ id: message.id, success: true, data: asset }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get asset.' }));
      }
      break;
    }
    // DELETE
    case 'DELETE': {
      const id = message.route.split('/').at(-1) as string;
      const del = await AssetModel.delAsset(id);
      if (del) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to delete asset.' }));
      break;
    }
    case 'SUB': {
      // Subscribe to all
      if (message.route === '/api/assets') {
        const sub = await AssetModel.subscribeAll((doc) => {
          const msg = { id: message.id, event: doc };
          socket.send(JSON.stringify(msg));
        });
        if (sub) cache.add(message.id, [sub]);
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

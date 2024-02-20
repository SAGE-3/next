/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
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

// Collection Imports
import { AppsCollection, BoardsCollection, RoomsCollection } from '../../collections';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { APIClientWSMessage } from '@sage3/shared/types';
import { SBAuthSchema } from '@sage3/sagebase';
import { PresenceThrottle } from './presencethrottle';

/**
 * This class is for CUSTOM SUBSCRIPTIONS
 * @param socket
 * @param request
 * @param message
 * @param cache
 */
export async function subscriptionWSRouter(
  socket: WebSocket,
  message: APIClientWSMessage,
  user: SBAuthSchema,
  cache: SubscriptionCache
): Promise<void> {
  switch (message.method) {
    case 'SUB': {
      // Subscribe to a room and all its children (Boards, apps)
      if (message.route.startsWith('/api/subscription/rooms/')) {
        const roomId = message.route.split('/').at(-1);
        if (!roomId) {
          socket.send(JSON.stringify({ id: message.id, success: false, message: 'No id provided' }));
          return;
        }
        const roomSub = await RoomsCollection.subscribe(roomId, (doc) => {
          const msg = { id: message.id, event: doc };
          socket.send(JSON.stringify(msg));
        });
        const boardsSub = await BoardsCollection.subscribeByQuery('roomId', roomId, (doc) => {
          const msg = { id: message.id, event: doc };
          socket.send(JSON.stringify(msg));
        });
        const appsSub = await AppsCollection.subscribeByQuery('roomId', roomId, (doc) => {
          const msg = { id: message.id, event: doc };
          socket.send(JSON.stringify(msg));
        });
        const subs = [];
        if (roomSub) subs.push(roomSub);
        if (boardsSub) subs.push(boardsSub);
        if (appsSub) subs.push(appsSub);
        if (subs) cache.add(message.id, subs);
        break;
      }
      // Subscribe to a board and all its children (apps)
      else if (message.route.startsWith('/api/subscription/boards/')) {
        const boardId = message.route.split('/').at(-1);
        if (!boardId) {
          socket.send(JSON.stringify({ id: message.id, success: false, message: 'No id provided' }));
          return;
        }
        const boardSub = await BoardsCollection.subscribe(boardId, (doc) => {
          const msg = { id: message.id, event: doc };
          socket.send(JSON.stringify(msg));
        });
        const appsSub = await AppsCollection.subscribeByQuery('boardId', boardId, (doc) => {
          const msg = { id: message.id, event: doc };
          socket.send(JSON.stringify(msg));
        });
        const subs = [];
        if (boardSub) subs.push(boardSub);
        if (appsSub) subs.push(appsSub);
        if (subs) cache.add(message.id, subs);
      }
      // Subscribe to the presence collection
      // Presence collection is unique in that it is throttled
      else if (message.route === '/api/subscription/presence') {
        PresenceThrottle.addSubscription(message.id, socket);
      } else {
        console.log('Subscription> Not found', message.route);
      }
      break;
    }
    case 'UNSUB': {
      // Attempt to remove the subscription from presence. It might not be for presence but have to check to avoid memory leak
      PresenceThrottle.removeClient(message.id);
      // Unsubscribe Message
      cache.delete(message.id);
      break;
    }
    default: {
      socket.send(JSON.stringify({ id: message.id, success: false, message: 'Invalid method.' }));
    }
  }
}

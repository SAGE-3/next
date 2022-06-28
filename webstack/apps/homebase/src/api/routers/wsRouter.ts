/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// External Imports
import { WebSocket } from 'ws';

// Custom Routes
import { assetWSRouter } from './custom/asset';
import { subscriptionWSRouter } from './custom/subscription';
// Collection Imports
import { AppsCollection, BoardsCollection, RoomsCollection, UsersCollection } from '../collections';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { APIClientWSMessage } from '@sage3/shared/types';

const wsRoutes = {
  '/assets': assetWSRouter,
  '/apps': (socket: WebSocket, message: APIClientWSMessage, userId: string, cache: SubscriptionCache) =>
    AppsCollection.wsRouter(socket, message, userId, cache),
  '/boards': (socket: WebSocket, message: APIClientWSMessage, userId: string, cache: SubscriptionCache) =>
    BoardsCollection.wsRouter(socket, message, userId, cache),
  '/rooms': (socket: WebSocket, message: APIClientWSMessage, userId: string, cache: SubscriptionCache) =>
    RoomsCollection.wsRouter(socket, message, userId, cache),
  '/users': (socket: WebSocket, message: APIClientWSMessage, userId: string, cache: SubscriptionCache) =>
    UsersCollection.wsRouter(socket, message, userId, cache),
  '/subscription': subscriptionWSRouter,
} as {
  [key: string]: (socket: WebSocket, message: APIClientWSMessage, userId: string, cache: SubscriptionCache) => Promise<void>;
};

export function wsAPIRouter(socket: WebSocket, message: APIClientWSMessage, userId: string, cache: SubscriptionCache): void {
  const route = '/' + message.route.split('/')[2];
  if (wsRoutes[route] != undefined) {
    wsRoutes[route](socket, message, userId, cache);
  }
}

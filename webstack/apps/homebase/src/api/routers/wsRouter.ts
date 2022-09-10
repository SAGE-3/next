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
import { AppsCollection, BoardsCollection, PresenceCollection, RoomsCollection, UsersCollection } from '../collections';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { APIClientWSMessage } from '@sage3/shared/types';
import { SBAuthSchema } from '@sage3/sagebase';

const wsRoutes = {
  '/assets': assetWSRouter,
  '/apps': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    AppsCollection.wsRouter(socket, message, user, cache),
  '/boards': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    BoardsCollection.wsRouter(socket, message, user, cache),
  '/rooms': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    RoomsCollection.wsRouter(socket, message, user, cache),
  '/users': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    UsersCollection.wsRouter(socket, message, user, cache),
  '/presence': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    PresenceCollection.wsRouter(socket, message, user, cache),
  '/subscription': subscriptionWSRouter,
} as {
  [key: string]: (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) => Promise<void>;
};

export function wsAPIRouter(socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache): void {
  const route = '/' + message.route.split('/')[2];
  if (wsRoutes[route] != undefined) {
    wsRoutes[route](socket, message, user, cache);
  }
}

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// External Imports
import { WebSocket } from 'ws';

// Custom Routes
import { subscriptionWSRouter } from './custom/subscription';
// Collection Imports
import {
  AssetsCollection,
  AppsCollection,
  BoardsCollection,
  PresenceCollection,
  RoomsCollection,
  UsersCollection,
  MessageCollection,
  PluginsCollection,
  InsightCollection,
  RoomMembersCollection,
  AnnotationsCollection,
} from '../collections';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { APIClientWSMessage } from '@sage3/shared/types';
import { SBAuthSchema } from '@sage3/sagebase';

const wsRoutes = {
  '/assets': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    AssetsCollection.wsRouter(socket, message, user, cache),
  '/apps': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    AppsCollection.wsRouter(socket, message, user, cache),
  '/boards': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    BoardsCollection.wsRouter(socket, message, user, cache),
  '/rooms': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    RoomsCollection.wsRouter(socket, message, user, cache),
  '/roommembers': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    RoomMembersCollection.wsRouter(socket, message, user, cache),
  '/users': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    UsersCollection.wsRouter(socket, message, user, cache),
  '/presence': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    PresenceCollection.wsRouter(socket, message, user, cache),
  '/message': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    MessageCollection.wsRouter(socket, message, user, cache),
  '/plugins': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    PluginsCollection.wsRouter(socket, message, user, cache),
  '/insight': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    InsightCollection.wsRouter(socket, message, user, cache),
  '/annotations': (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) =>
    AnnotationsCollection.wsRouter(socket, message, user, cache),
  '/subscription': subscriptionWSRouter,
} as {
  [key: string]: (socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache) => Promise<void>;
};

export function wsAPIRouter(socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, cache: SubscriptionCache): void {
  const route = '/' + message.route.split('/')[2];
  const routeName = Object.keys(wsRoutes).find((el) => route.startsWith(el));
  if (routeName) {
    wsRoutes[routeName](socket, message, user, cache);
  }
}

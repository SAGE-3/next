/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// External Imports 
import { IncomingMessage } from "http";
import { WebSocket } from 'ws';

// App Imports
import { boardWSRouter, roomWSRouter, userWSRouter, appWSRouter } from "../ws";

// Lib Imports
import { SubscriptionCache } from "@sage3/backend";
import { APIClientWSMessage } from "@sage3/shared/types";

const wsRoutes = {
  '/app': appWSRouter,
  '/user': userWSRouter,
  '/room': roomWSRouter,
  '/board': boardWSRouter
} as { [key: string]: (socket: WebSocket, request: IncomingMessage, message: APIClientWSMessage, cache: SubscriptionCache) => Promise<void> }

export function wsAPIRouter(socket: WebSocket, request: IncomingMessage, message: APIClientWSMessage, cache: SubscriptionCache): void {
  const route = '/' + message.route.split('/')[2];
  if (wsRoutes[route] != undefined) {
    wsRoutes[route](socket, request, message, cache);
  }
}

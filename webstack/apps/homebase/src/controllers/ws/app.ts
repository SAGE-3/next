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
import { APIClientWSMessage } from '@sage3/shared/types';
import { AppSchema, AppState } from '@sage3/applications/schema';

/**
 * 
 * @param socket 
 * @param request 
 * @param message 
 * @param cache 
 */
export async function appWSRouter(socket: WebSocket, request: IncomingMessage, message: APIClientWSMessage, cache: SubscriptionCache): Promise<void> {
  const auth = request.session.passport.user;
  switch (message.method) {
    case 'POST': {
      // CREATE APP
      const body = message.body as Partial<AppSchema>;
      if (body === undefined) {
        socket.send(JSON.stringify({ id: message.id, success: false, message: 'No body provided' }));
        return;
      } else {
        const app = await AppService.create(auth.id, body);
        if (app) socket.send(JSON.stringify({ id: message.id, success: true, data: app }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to create app.' }));
      }
      break;
    }
    case 'GET': {
      // READ ALL APPS
      if (message.route.startsWith('/api/apps')) {
        const apps = await AppService.readAll();
        if (apps) socket.send(JSON.stringify({ id: message.id, success: true, data: apps }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get apps.' }));
      }
      // READ ONE APP 
      else if (message.route.startsWith('/api/apps/')) {
        const appId = message.route.split('/').at(-1) as string;
        const app = await AppService.read(appId);
        if (app) socket.send(JSON.stringify({ id: message.id, success: true, data: app }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get app.' }));
      }
      break;
    }
    case 'PUT': {
      const appId = message.route.split('/').at(-1) as string;
      let update;
      if (message.route.startsWith('/api/apps/state/')) {
        const body = message.body as Partial<AppState>;
        update = await AppService.updateState(appId, body);
      } else {
        const body = message.body as Partial<AppSchema>;
        update = await AppService.update(appId, body);
      }
      if (update) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to update app.' }));
      break;
    }
    case 'DELETE': {
      const appId = message.route.split('/').at(-1) as string;
      const del = await AppService.delete(appId);
      if (del) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to delete app.' }));
      break;
    }
    case 'SUB': {
      // Subscribe to all apps
      if (message.route.startsWith('/api/apps')) {
        const sub = await AppService.subscribeAll((doc) => {
          const msg = { id: message.id, event: doc }
          socket.send(JSON.stringify(msg));
        });
        if (sub) cache.add(message.id, [sub])
      }
      // Subscribe To One App
      else if (message.route.startsWith('/api/apps/')) {
        const id = message.route.split('/').at(-1);
        if (!id) {
          socket.send(JSON.stringify({ id: message.id, success: false, message: 'No id provided' }));
          return;
        }
        const sub = await AppService.subscribe(id, (doc) => {
          const msg = { id: message.id, event: doc }
          socket.send(JSON.stringify(msg));
        });
        if (sub) cache.add(message.id, [sub])
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
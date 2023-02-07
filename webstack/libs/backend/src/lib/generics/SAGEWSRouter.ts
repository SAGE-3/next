/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { WebSocket } from 'ws';

import { SBAuthSchema, SBDocumentUpdate, SBJSON } from '@sage3/sagebase';
import { APIClientWSMessage } from '@sage3/shared/types';

import { SubscriptionCache } from '../utils/subscription-cache';
import { SAGE3Collection } from './SAGECollection';
import { checkPermissionsWS, AuthSubject } from './permissions';

export async function sageWSRouter<T extends SBJSON>(
  collection: SAGE3Collection<T>,
  socket: WebSocket,
  message: APIClientWSMessage,
  user: SBAuthSchema,
  cache: SubscriptionCache
): Promise<void> {
  const path = '/api/' + collection.name.toLowerCase();

  //  Check permissions on collections
  if (!checkPermissionsWS(user, message.method, collection.name as AuthSubject)) {
    socket.send(JSON.stringify({ id: message.id, success: false, message: 'Not Allowed' }));
    return;
  }

  switch (message.method) {
    case 'POST': {
      // POST: Add new document
      const body = message.body as T;
      if (body === undefined) {
        socket.send(JSON.stringify({ id: message.id, success: false, message: 'No body provided' }));
        return;
      } else {
        const doc = await collection.add(body, user.id);
        if (doc) socket.send(JSON.stringify({ id: message.id, success: true, data: doc }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to create doc.' }));
      }
      break;
    }
    case 'GET': {
      // GET: Get all the docs.
      if (message.route === path) {
        const docs = await collection.getAll();
        if (docs) socket.send(JSON.stringify({ id: message.id, success: true, data: docs }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get docs.' }));
      }
      // GET: Get one doc.
      else if (message.route.startsWith(path + '/')) {
        const id = message.route.split('/').at(-1) as string;
        const doc = await collection.get(id);
        if (doc) socket.send(JSON.stringify({ id: message.id, success: true, data: doc }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get doc.' }));
      }
      break;
    }
    // PUT: Update one doc.
    case 'PUT': {
      const id = message.route.split('/').at(-1) as string;
      const body = message.body as SBDocumentUpdate<T>;
      const update = await collection.update(id, user.id, body);
      if (update) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to update doc.' }));
      break;
    }
    // DELETE: Delete one doc.
    case 'DELETE': {
      const id = message.route.split('/').at(-1) as string;
      const del = await collection.delete(id);
      if (del) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to delete doc.' }));
      break;
    }
    case 'SUB': {
      // Subscribe to all docs
      if (message.route === path) {
        const sub = await collection.subscribeAll((doc) => {
          const msg = { id: message.id, event: doc };
          socket.send(JSON.stringify(msg));
        });
        if (sub) cache.add(message.id, [sub]);
      } else if (message.route.includes('?') && message.route.includes('=')) {
        console.log(message.route);
        const parsedQuery = message.route.split('?')[1].split('=');
        if (parsedQuery.length != 2) {
          socket.send(JSON.stringify({ id: message.id, success: false, message: 'Improper query format.' }));
          return;
        } else {
          const prop = parsedQuery[0];
          const query = parsedQuery[1];
          const sub = await collection.subscribeByQuery(prop, query, (doc) => {
            const msg = { id: message.id, event: doc };
            socket.send(JSON.stringify(msg));
          });
          if (sub) cache.add(message.id, [sub]);
        }
      }
      // Subscribe to one doc
      else if (message.route.startsWith(path + '/')) {
        const id = message.route.split('/').at(-1);
        if (!id) {
          socket.send(JSON.stringify({ id: message.id, success: false, message: 'No id provided' }));
          return;
        }
        const sub = await collection.subscribe(id, (doc) => {
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

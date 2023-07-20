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

import { URL } from 'node:url';

export async function sageWSRouter<T extends SBJSON>(
  collection: SAGE3Collection<T>,
  socket: WebSocket,
  message: APIClientWSMessage,
  user: SBAuthSchema,
  cache: SubscriptionCache
): Promise<void> {
  // path to the current collection
  const path = '/api/' + collection.name.toLowerCase();

  // Create a URL object to parse the route:
  // second argument required because the route is a relative URL but otherwise meaningless
  const socket_url = new URL(message.route, 'ws://localhost');
  const route = message.route;
  // get all the parameters and their values into an array, instead of a Map
  const params = Array.from(socket_url.searchParams);
  const numParams = params.length;

  // Get the method
  const method = message.method;
  if (!method) {
    socket.send(JSON.stringify({ id: message.id, success: false, message: 'Invalid method' }));
    return;
  }

  switch (message.method) {
    case 'POST': {
      // POST: Add new document
      // If body is undefined, return an error
      if (message.body === undefined) {
        socket.send(JSON.stringify({ id: message.id, success: false, message: 'No body provided' }));
        return;
      } else {
        // If 'batch' is present on the body this is a batch post
        if (message.body.batch) {
          const body = message.body.batch as T[];
          const docs = await collection.addBatch(body, user.id);
          if (docs) socket.send(JSON.stringify({ id: message.id, success: true, data: docs }));
          else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to create docs.' }));
        } else {
          const body = message.body as T;
          const doc = await collection.add(body, user.id);
          if (doc) socket.send(JSON.stringify({ id: message.id, success: true, data: doc }));
          else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to create doc.' }));
        }
      }
      break;
    }
    case 'GET': {
      // Batch GET: Get multiple docs.
      const body = message.body;
      if (body && body.batch) {
        const ids = body.batch as string[];
        const docs = await collection.getBatch(ids, user.id);
        if (docs) socket.send(JSON.stringify({ id: message.id, success: true, data: docs }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get docs' }));
      }
      // GET: Get all the docs.
      else if (route === path) {
        const docs = await collection.getAll(user.id);
        if (docs) socket.send(JSON.stringify({ id: message.id, success: true, data: docs }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get docs' }));
      }
      // GET: Get one doc.
      else if (route.startsWith(path + '/')) {
        const id = getIdFromRoute(route);
        if (!id) {
          socket.send(JSON.stringify({ id: message.id, success: false, message: 'No id provided' }));
          return;
        }
        const doc = await collection.get(id, user.id);
        if (doc) socket.send(JSON.stringify({ id: message.id, success: true, data: doc }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get doc.' }));
      }
      break;
    }
    // PUT: Update one doc.
    case 'PUT': {
      // PUT: Update a document
      // If body is undefined, return an error
      if (message.body === undefined) {
        socket.send(JSON.stringify({ id: message.id, success: false, message: 'No body provided' }));
        return;
      } else {
        // If path ends with /batch, this is a batch post
        const body = message.body;
        // Batch PUT: Update multiple docs.
        if (body.batch) {
          const batch = body.batch as { id: string; updates: SBDocumentUpdate<T> }[];
          const docs = await collection.updateBatch(batch, user.id);
          if (docs) socket.send(JSON.stringify({ id: message.id, success: true, data: docs }));
          else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to update docs.' }));
        } else {
          // This is a single update to a specific document
          // Check for ID in route.
          const id = getIdFromRoute(route);
          if (!id) {
            socket.send(JSON.stringify({ id: message.id, success: false, message: 'No id provided' }));
            return;
          }
          // Get Body
          const body = message.body as SBDocumentUpdate<T>;
          const doc = await collection.update(id, user.id, body);
          if (doc) socket.send(JSON.stringify({ id: message.id, success: true, data: doc }));
          else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to create doc.' }));
        }
      }
      break;
    }
    // DELETE: Delete one doc.
    case 'DELETE': {
      // Check if body is an array, if so this is a batch delete
      const body = message.body;
      if (body && body.batch) {
        const batch = body.batch as string[];
        const docs = await collection.deleteBatch(batch, user.id);
        if (docs) socket.send(JSON.stringify({ id: message.id, success: true, data: docs }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to delete docs.' }));
      } else {
        const id = getIdFromRoute(route);
        if (!id) {
          socket.send(JSON.stringify({ id: message.id, success: false, message: 'No id provided' }));
          return;
        }
        const del = await collection.delete(id, user.id);
        if (del) socket.send(JSON.stringify({ id: message.id, success: true }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to delete doc' }));
      }
      break;
    }
    case 'SUB': {
      // Subscribe to all docs
      if (route === path) {
        const sub = await collection.subscribeAll((doc) => {
          const msg = { id: message.id, event: doc };
          socket.send(JSON.stringify(msg));
        }, user.id);
        if (sub) cache.add(message.id, [sub]);
      } else if (numParams > 0) {
        if (numParams != 1) {
          socket.send(JSON.stringify({ id: message.id, success: false, message: 'Improper query format' }));
          return;
        } else {
          const prop = params[0][0]; // first key
          const query = params[0][1]; // first value
          const sub = await collection.subscribeByQuery(
            prop,
            query,
            (doc) => {
              const msg = { id: message.id, event: doc };
              socket.send(JSON.stringify(msg));
            },
            user.id
          );
          if (sub) cache.add(message.id, [sub]);
        }
      }
      // Subscribe to one doc
      else if (route.startsWith(path + '/')) {
        const id = getIdFromRoute(route);
        if (!id) {
          socket.send(JSON.stringify({ id: message.id, success: false, message: 'No id provided' }));
          return;
        }
        const sub = await collection.subscribe(
          id,
          (doc) => {
            const msg = { id: message.id, event: doc };
            socket.send(JSON.stringify(msg));
          },
          user.id
        );
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
      socket.send(JSON.stringify({ id: message.id, success: false, message: 'Invalid method' }));
    }
  }
}

/*
 * Get the id from the end of the route
 *
 * @param {string} route
 * @returns {(string | undefined)}
 * */
function getIdFromRoute(route: string): string | undefined {
  return route.split('/').at(-1);
}

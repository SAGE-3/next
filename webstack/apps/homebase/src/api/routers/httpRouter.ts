/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Express API Router.
 * @file API Routes Loader
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

// NPM imports
import * as express from 'express';

// Asset imports

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
} from '../collections';

// SAGEBase Imports
import { SAGEBase } from '@sage3/sagebase';

// Custom Routes
import { FilesRouter, ConfigRouter, InfoRouter, TimeRouter, NLPRouter } from './custom';

import { config } from '../../config';
import { boardPermission } from '../permissions/boardPermission';

import { SAGEPermissionInstance } from '../permissions/SAGE3Authorization';

/**
 * API Loader function
 * @export
 * @param {any} io  The Socket.io object instance created in main.ts.
 * @returns {express.Router} returns the express router object
 */
export function expressAPIRouter(): express.Router {
  // Express routing
  const router = express.Router();

  // Before auth, so can be accessed by anyone
  router.use('/info', InfoRouter());
  router.use('/time', TimeRouter());

  // Download the file from an Asset using a public route with a UUIDv5 token
  // route: /api/files/:id/:token
  router.use('/files', FilesRouter());

  // Authenticate all API Routes
  router.use(SAGEBase.Auth.authenticate);

  // Collections
  router.use('/users', UsersCollection.router());
  router.use('/assets', AssetsCollection.router());
  router.use('/apps', AppsCollection.router());
  router.use('/boards', boardPermission, BoardsCollection.router());
  router.use('/rooms', RoomsCollection.router());
  router.use('/presence', PresenceCollection.router());
  router.use('/message', MessageCollection.router());

  // Check to see if plugins module is enabled.
  if (config.features.plugins) {
    router.use('/plugins', PluginsCollection.router());
  }

  // Configuration Route
  router.use('/configuration', ConfigRouter());

  // Experimental NLP route
  router.use('/nlp', NLPRouter());

  return router;
}

console.log('can admin create board', SAGEPermissionInstance.can('admin', 'create', 'boards'));
console.log('can admin read board', SAGEPermissionInstance.can('admin', 'read', 'boards'));
console.log('can admin update board', SAGEPermissionInstance.can('admin', 'update', 'boards'));
console.log('can admin delete board', SAGEPermissionInstance.can('admin', 'delete', 'boards'));
console.log('can user create board', SAGEPermissionInstance.can('user', 'create', 'boards'));
console.log('can user read board', SAGEPermissionInstance.can('user', 'read', 'boards'));
console.log('can user update board', SAGEPermissionInstance.can('user', 'update', 'boards'));
console.log('can user delete board', SAGEPermissionInstance.can('user', 'delete', 'boards'));
console.log('can guest create board', SAGEPermissionInstance.can('guest', 'create', 'boards'));
console.log('can guest read board', SAGEPermissionInstance.can('guest', 'read', 'boards'));
console.log('can guest update board', SAGEPermissionInstance.can('guest', 'update', 'boards'));
console.log('can guest create board', SAGEPermissionInstance.can('guest', 'create', 'boards'));

console.log('can admin create room', SAGEPermissionInstance.can('admin', 'create', 'rooms'));
console.log('can admin read room', SAGEPermissionInstance.can('admin', 'read', 'rooms'));
console.log('can admin update room', SAGEPermissionInstance.can('admin', 'update', 'rooms'));
console.log('can admin delete room', SAGEPermissionInstance.can('admin', 'delete', 'rooms'));
console.log('can user create room', SAGEPermissionInstance.can('user', 'create', 'rooms'));
console.log('can user read room', SAGEPermissionInstance.can('user', 'read', 'rooms'));
console.log('can user update room', SAGEPermissionInstance.can('user', 'update', 'rooms'));
console.log('can user delete room', SAGEPermissionInstance.can('user', 'delete', 'rooms'));
console.log('can guest create room', SAGEPermissionInstance.can('guest', 'create', 'rooms'));
console.log('can guest read room', SAGEPermissionInstance.can('guest', 'read', 'rooms'));
console.log('can guest update room', SAGEPermissionInstance.can('guest', 'update', 'rooms'));
console.log('can guest create room', SAGEPermissionInstance.can('guest', 'create', 'rooms'));

console.log('can admin create app', SAGEPermissionInstance.can('admin', 'create', 'apps'));
console.log('can admin read app', SAGEPermissionInstance.can('admin', 'read', 'apps'));
console.log('can admin update app', SAGEPermissionInstance.can('admin', 'update', 'apps'));
console.log('can admin delete app', SAGEPermissionInstance.can('admin', 'delete', 'apps'));
console.log('can user create app', SAGEPermissionInstance.can('user', 'create', 'apps'));
console.log('can user read app', SAGEPermissionInstance.can('user', 'read', 'apps'));
console.log('can user update app', SAGEPermissionInstance.can('user', 'update', 'apps'));
console.log('can user delete app', SAGEPermissionInstance.can('user', 'delete', 'apps'));
console.log('can guest create app', SAGEPermissionInstance.can('guest', 'create', 'apps'));
console.log('can guest read app', SAGEPermissionInstance.can('guest', 'read', 'apps'));
console.log('can guest update app', SAGEPermissionInstance.can('guest', 'update', 'apps'));
console.log('can guest create app', SAGEPermissionInstance.can('guest', 'create', 'apps'));

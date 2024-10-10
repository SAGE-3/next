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
  InsightCollection,
  RoomMembersCollection,
  AnnotationsCollection,
} from '../collections';

// SAGEBase Imports
import { SAGEBase } from '@sage3/sagebase';

// Custom Routes
import {
  FilesRouter,
  ConfigRouter,
  InfoRouter,
  TimeRouter,
  NLPRouter,
  LogsRouter,
  KernelsRouter,
  PresenceThrottle,
  AiRouter,
  AgentRouter,
} from './custom';

import { config } from '../../config';

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
  router.use('/logs', LogsRouter());

  // Download the file from an Asset using a public route with a UUIDv5 token
  // route: /api/files/:id/:token
  router.use('/files', FilesRouter());

  // Authenticate all API Routes
  router.use(SAGEBase.Auth.authenticate);

  // Kernels Routes
  router.use('/kernels', KernelsRouter());

  // Collections
  router.use('/users', UsersCollection.router());
  router.use('/assets', AssetsCollection.router());
  router.use('/apps', AppsCollection.router());
  router.use('/boards', BoardsCollection.router());
  router.use('/rooms', RoomsCollection.router());
  router.use('/presence', PresenceCollection.router());
  router.use('/message', MessageCollection.router());
  router.use('/insight', InsightCollection.router());
  router.use('/roommembers', RoomMembersCollection.router());
  router.use('/annotations', AnnotationsCollection.router());

  // Check to see if plugins module is enabled.
  if (config.features.plugins) {
    router.use('/plugins', PluginsCollection.router());
  }

  // Configuration Route
  router.use('/configuration', ConfigRouter());

  // Experimental NLP route
  router.use('/nlp', NLPRouter());

  // Ai Routes
  router.use('/ai', AiRouter());

  // Agent Routes
  router.use('/agents', AgentRouter());

  // Initialize Custom Presence Throttle
  PresenceThrottle.init();

  return router;
}

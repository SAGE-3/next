/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
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
import { assetExpressRouter } from './custom/asset';

// Collection Imports
import { AppsCollection, BoardsCollection, PresenceCollection, RoomsCollection, UsersCollection, MessageCollection } from '../collections';
import { ConfigRouter, InfoRouter, TimeRouter } from './config';

// SAGEBase Imports
import { SAGEBase } from '@sage3/sagebase';
import { NLPRouter } from './custom/nlp';

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

  // Authenticate all API Routes
  router.use(SAGEBase.Auth.authenticate);

  router.use('/users', UsersCollection.router());

  router.use('/assets', assetExpressRouter());

  router.use('/apps', AppsCollection.router());

  router.use('/boards', BoardsCollection.router());

  router.use('/rooms', RoomsCollection.router());

  router.use('/presence', PresenceCollection.router());

  router.use('/message', MessageCollection.router());

  router.use('/configuration', ConfigRouter());

  router.use('/nlp', NLPRouter());

  return router;
}

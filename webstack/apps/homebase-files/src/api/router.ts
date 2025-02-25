/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { AssetsCollection } from './assetsCollection';
import { FilesRouter } from './files';
// NPM imports
import * as express from 'express';
import { MessageCollection } from './messageCollection';
// SAGEBase Imports
import { SAGEBase } from '@sage3/sagebase';

/**
 * API Loader function
 * @export
 * @param {any} io  The Socket.io object instance created in main.ts.
 * @returns {express.Router} returns the express router object
 */
export async function expressAPIRouter(): Promise<express.Router> {
  // Express routing
  const router = express.Router();

  await AssetsCollection.initialize();
  await MessageCollection.initialize();

  // Download the file from an Asset using a public route with a UUIDv5 token
  // route: /api/files/:id/:token
  router.use('/files', FilesRouter());

  // Authenticate all API Routes
  router.use(SAGEBase.Auth.authenticate);

  // /api/assets/upload
  // /api/assets/static/:filename
  router.use('/assets', AssetsCollection.router());

  return router;
}

export default expressAPIRouter;

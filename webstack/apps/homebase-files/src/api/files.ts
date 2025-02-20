/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Upload API Router.
 * @file Upload Router
 * @author <a href="mailto:renambot@uic.edu">Luc Renambot</a>
 * @version 1.0.0
 */

// Express web server framework
import * as express from 'express';
// Node modules
import * as path from 'path';
import { v5 as uuidv5 } from 'uuid';

// Get server configuration
import { config } from '../config';
// Asset model
import { AssetsCollection } from './assetsCollection';

/**
 * App route/api express middleware.
 * @returns {express.Router} returns the express router object
 */
export function FilesRouter(): express.Router {
  const router = express.Router();

  // Get one asset: GET /api/files/:id/:token
  router.get('/:id/:token', async ({ params }, res) => {
    // Get the asset
    const data = await AssetsCollection.get(params.id);
    // Calculate the uuid v5 from asset id and namespace (from config)
    const key = uuidv5(params.id, config.namespace);
    // if it matches the passed token, send the file
    if (data && key === params.token) {
      res.status(200).download(path.resolve(data.data.path), data.data.originalfilename);
    } else {
      res.status(500).send({ success: false });
    }
  });

  return router;
}

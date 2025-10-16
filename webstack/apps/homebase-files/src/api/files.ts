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
import { Readable } from 'node:stream';

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

  // Download a file from a URL and pipe it to the response
  // route: /api/files/download/:url
  router.get('/download/:url', async ({ params }, res) => {
    const fileUrl = params.url as string;
    if (!fileUrl) return res.status(400).send('Missing URL');
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const body = response.body;
      if (!body) return res.status(500).send('No content returned');

      // Forward headers
      // set the content type to the one from the fetched file or default to binary
      res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
      // set the content disposition to attachment to prompt download with the original filename
      // or 'download' if the filename cannot be determined from the URL
      res.setHeader('Content-Disposition', `attachment; filename="${decodeURIComponent(fileUrl.split('/').pop() || 'download')}"`);

      // Convert from Web stream -> Node stream
      const nodeStream = Readable.fromWeb(body as any);
      nodeStream.pipe(res);
    } catch (err) {
      console.error(err);
      res.status(500).send('Download failed');
    }
  });

  // Get one asset: GET /api/files/:id/:token
  // route: /api/files/:id/:token
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

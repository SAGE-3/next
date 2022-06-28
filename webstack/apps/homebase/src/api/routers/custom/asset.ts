/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Upload API Router.
 * @file Upload Router
 * @author <a href="mailto:renambot@uic.edu">Luc Renambot</a>
 * @version 1.0.0
 */

// Express web server framework
import * as express from 'express';

import { config } from '../../../config';

// Local storage
import { uploadMiddleware } from '../../../connectors/upload-connector';

// Asset model
import { AssetsCollection } from '../../collections';

// External Imports
import { WebSocket } from 'ws';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { APIClientWSMessage } from '@sage3/shared/types';
import { SBAuthSchema } from '@sage3/sagebase';

// Google storage and AWS S3 storage
// import { multerGoogleMiddleware, multerS3Middleware } from './middleware-upload';

/**
 * App route/api express middleware.
 * @returns {express.Router} returns the express router object
 */
export function assetExpressRouter(): express.Router {
  const router = express.Router();

  // Upload files: POST /api/assets/upload
  router.post('/upload', uploadHandler);

  // CRUD routes

  // Get all the assets: GET /api/assets
  router.get('/', async (req, res) => {
    const docs = await AssetsCollection.getAllAssets();
    if (docs) res.status(200).send({ success: true, data: docs });
    else res.status(500).send({ success: false });
  });

  // Get one asset: GET /api/assets/:id
  router.get('/:id', async ({ params }, res) => {
    const data = await AssetsCollection.getAsset(params.id);
    if (data) res.status(200).send({ success: true, data: [data] });
    else res.status(500).send({ success: false });
  });

  // Delete one asset: DEL /api/assets/:id
  router.delete('/:id', async ({ params }, res) => {
    const data = await AssetsCollection.delAsset(params.id);
    if (data) res.status(200).send({ success: true, data });
    else res.status(500).send({ success: false });
  });

  // Access to uploaded files: GET /api/assets/static/:filename
  const assetFolder = config.assets;
  router.use('/static', express.static(assetFolder));

  return router;
}

function uploadHandler(req: express.Request, res: express.Response): void {
  uploadMiddleware('files')(req, res, (err) => {
    // multerGoogleMiddleware("files")(req, res, (err) => {
    // multerS3Middleware("files")(req, res, (err) => {
    if (err) {
      console.log('multerMiddleware>', err.message);
      res.status(500).send(err.message);
      return;
    }
    // destructure the request into an array of file objects
    const { files } = req as any as {
      files: Array<{
        originalname: string;
        mimetype: string;
        filename: string;
        path: string;
        destination: string;
        size: number;
      }>;
    };

    // Get the current uploader information
    const user = req.user as SBAuthSchema;

    // Do something with the files
    files.forEach((elt) => {
      console.log('FileUpload>', elt.originalname, elt.mimetype, elt.filename, elt.size);
      // Put the new file into the collection
      AssetsCollection.addAsset({
        file: elt.filename,
        owner: user.id || '-',
        room: req.body.room || '-',
        originalfilename: elt.originalname,
        path: elt.path,
        destination: elt.destination,
        size: elt.size,
        mimetype: elt.mimetype,
        dateAdded: new Date().toISOString(),
      });
    });

    // Return success with the information
    res.status(200).send(files);
  });
}

/**
 *
 * @param socket
 * @param request
 * @param message
 * @param cache
 */
export async function assetWSRouter(
  socket: WebSocket,
  message: APIClientWSMessage,
  userId: string,
  cache: SubscriptionCache
): Promise<void> {
  // const auth = request.session.passport.user;
  switch (message.method) {
    case 'GET': {
      // READ ALL
      if (message.route === '/api/assets') {
        const assets = await AssetsCollection.getAllAssets();
        if (assets) socket.send(JSON.stringify({ id: message.id, success: true, data: assets }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get assets.' }));
      }
      // READ ONE
      else if (message.route.startsWith('/api/assets/')) {
        const id = message.route.split('/').at(-1) as string;
        const asset = await AssetsCollection.getAsset(id);
        if (asset) socket.send(JSON.stringify({ id: message.id, success: true, data: asset }));
        else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to get asset.' }));
      }
      break;
    }
    // DELETE
    case 'DELETE': {
      const id = message.route.split('/').at(-1) as string;
      const del = await AssetsCollection.delAsset(id);
      if (del) socket.send(JSON.stringify({ id: message.id, success: true }));
      else socket.send(JSON.stringify({ id: message.id, success: false, message: 'Failed to delete asset.' }));
      break;
    }
    case 'SUB': {
      // Subscribe to all
      if (message.route === '/api/assets') {
        const sub = await AssetsCollection.subscribeAll((doc) => {
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

//
// Metadata from multer for each storage engine
//

// Local storage
// fieldname: 'files',
// originalname: 't1.jpg',
// encoding: '7bit',
// mimetype: 'image/jpeg',
// destination: '/Users/luc/Desktop/Base/sagebase-demo/server/build/src/assets/',
// filename: '40170714-3fd2-42ab-8861-299bca27516e.jpg',
// path: '/Users/luc/Desktop/Base/sagebase-demo/server/build/src/assets/40170714-3fd2-42ab-8861-299bca27516e.jpg',
// size: 22511

// GOOGLE storage
// fieldname: 'files',
// originalname: 't1.jpg',
// encoding: '7bit',
// mimetype: 'image/jpeg',
// bucket: 'sage3-bucket1',
// destination: '',
// filename: '79239e00-a02d-4b60-b718-f634db0cc984.jpg',
// path: '79239e00-a02d-4b60-b718-f634db0cc984.jpg',
// contentType: 'image/jpeg',
// size: 22511,
// uri: 'gs://sage3-bucket1/79239e00-a02d-4b60-b718-f634db0cc984.jpg',
// linkUrl: 'https://storage.googleapis.com/sage3-bucket1/79239e00-a02d-4b60-b718-f634db0cc984.jpg',
// selfLink: 'https://www.googleapis.com/storage/v1/b/sage3-bucket1/o/79239e00-a02d-4b60-b718-f634db0cc984.jpg'

// AWS S3 storage
// fieldname: 'files',
// originalname: 't1.jpg',
// encoding: '7bit',
// mimetype: 'image/jpeg',
// size: 22511,
// bucket: 'sage_bucket',
// key: 'afe37be0-389c-425a-b54f-dc9bb0ce259b.jpg',
// acl: 'public-read',
// contentType: 'application/octet-stream',
// contentDisposition: null,
// contentEncoding: null,
// storageClass: 'STANDARD',
// serverSideEncryption: null,
// metadata: { fieldName: 'files' },
// location: 'https://s3.amazonaws.com/sage_bucket/afe37be0-389c-425a-b54f-dc9bb0ce259b.jpg',
// etag: '"5665c67887072b138c4278e3812646de"',
// versionId: undefined

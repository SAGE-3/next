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
// Mime type definitions
import * as mime from 'mime';
import * as fs from 'fs';

import { config } from '../../../config';

// Local storage
import { uploadMiddleware } from '../../../connectors/upload-connector';

// Asset model
import { AssetsCollection, AppsCollection } from '../../collections';

// External Imports
import { WebSocket } from 'ws';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { APIClientWSMessage, ExtraImageType, ExtraPDFType } from '@sage3/shared/types';
import { SBAuthSchema } from '@sage3/sagebase';
import { isCSV, isImage, isPDF, isText, isJSON } from '@sage3/shared';

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

    let openFIles = false;
    let tx: number, ty: number, tw: number, th: number;
    let posx: number;
    if (req.body.targetX && req.body.targetY) {
      openFIles = true;
      // Values position and size from the upload form data
      tx = Number(req.body.targetX);
      ty = Number(req.body.targetY);
      tw = Number(req.body.targetWidth);
      th = Number(req.body.targetHeight);
      // Position of the first file in the array
      posx = tx;
    }

    // Get the current uploader information
    const user = req.user as SBAuthSchema;

    // Do something with the files
    files.forEach(async (elt) => {
      console.log('FileUpload>', elt.originalname, elt.mimetype, elt.filename, elt.size);
      // Normalize mime types using the mime package
      elt.mimetype = mime.getType(elt.originalname) || elt.mimetype;
      // Put the new file into the collection
      const assetID = await AssetsCollection.addAsset(
        {
          file: elt.filename,
          owner: user.id || '-',
          room: req.body.room || '-',
          originalfilename: elt.originalname,
          path: elt.path,
          destination: elt.destination,
          size: elt.size,
          mimetype: elt.mimetype,
          dateAdded: new Date().toISOString(),
        },
        user.id
      );
      if (assetID) {
        const asset1 = await AssetsCollection.getAsset(assetID);
        if (asset1) {
          // Process the file (metadata, image, pdf, etc.)
          await AssetsCollection.processFile(asset1);
          // If we need to open the file, do it
          if (openFIles) {
            const asset = await AssetsCollection.getAsset(assetID);
            if (asset) {
              if (isImage(elt.mimetype)) {
                // Get metadata information about the image
                const derived = asset.data.derived as ExtraImageType;
                const ar = derived.aspectRatio || 1;
                const width = tw || 300;
                const height = th || width / ar;
                AppsCollection.add(
                  {
                    name: 'ImageViewer',
                    description: 'Image Description',
                    roomId: req.body.room,
                    boardId: req.body.board,
                    ownerId: user.id,
                    position: { x: posx - width / 2, y: ty - height / 2, z: 0 },
                    size: { width, height, depth: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    type: 'ImageViewer',
                    state: { id: assetID },
                    minimized: false,
                    raised: false,
                  },
                  user.id
                );
                posx += width + 10;
              } else if (isPDF(elt.mimetype)) {
                // Get metadata information about the PDF
                const derived = asset.data.derived as ExtraPDFType;
                const firstPage = derived[0];
                const ar = firstPage[0].width / firstPage[0].height;
                const width = tw || 500;
                const height = th || width / ar;
                AppsCollection.add(
                  {
                    name: 'PDFViewer',
                    description: 'PDFViewer Description',
                    roomId: req.body.room,
                    boardId: req.body.board,
                    ownerId: user.id,
                    position: { x: posx - width / 2, y: ty - height / 2, z: 0 },
                    size: { width, height, depth: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    type: 'PDFViewer',
                    state: { id: assetID, currentPage: 0, numPages: derived.length },
                    minimized: false,
                    raised: false,
                  },
                  user.id
                );
                posx += width + 10;
              } else if (isCSV(elt.mimetype)) {
                const w = tw || 800;
                const h = th || 400;
                AppsCollection.add(
                  {
                    name: 'CSVViewer',
                    description: 'CSVViewer Description',
                    roomId: req.body.room,
                    boardId: req.body.board,
                    ownerId: user.id,
                    position: { x: posx - w / 2, y: ty - h / 2, z: 0 },
                    size: { width: w, height: h, depth: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    type: 'CSVViewer',
                    state: { id: assetID },
                    minimized: false,
                    raised: false,
                  },
                  user.id
                );
                posx += tw || 800;
                posx += 10;
              } else if (isText(elt.mimetype)) {
                const text = fs.readFileSync(elt.path);
                const w = tw || 400;
                const h = th || 400;
                AppsCollection.add(
                  {
                    name: 'Stickie',
                    description: 'Stickie',
                    roomId: req.body.room,
                    boardId: req.body.board,
                    ownerId: user.id,
                    position: { x: posx - w / 2, y: ty - h / 2, z: 0 },
                    size: { width: w, height: h, depth: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    type: 'Stickie',
                    state: { fontSize: 48, color: '#63B3ED', text: text.toString(), executeInfo: { executeFunc: '', params: {} } },
                    minimized: false,
                    raised: false,
                  },
                  user.id
                );
                posx += tw || 400;
                posx += 10;
              } else if (isJSON(elt.mimetype)) {
                const text = fs.readFileSync(elt.path);
                const w = tw || 500;
                const h = th || 600;
                AppsCollection.add(
                  {
                    name: 'VegaLite',
                    description: 'VegaLite> ' + elt.originalname,
                    roomId: req.body.room,
                    boardId: req.body.board,
                    ownerId: user.id,
                    position: { x: posx - w / 2, y: ty - h / 2, z: 0 },
                    size: { width: w, height: h, depth: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    type: 'VegaLite',
                    state: { spec: text.toString() },
                    minimized: false,
                    raised: false,
                  },
                  user.id
                );
                posx += tw || 500;
                posx += 10;
              }
            }
          }
        }
      }
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

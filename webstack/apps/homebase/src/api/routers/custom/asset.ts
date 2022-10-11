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
import { v4 as getUUID } from 'uuid';
import { createClient } from 'redis';
import fetch from 'node-fetch';

import { config } from '../../../config';

// Local storage
import { uploadMiddleware } from '../../../connectors/upload-connector';

// Asset model
import { AssetsCollection, AppsCollection, MessageCollection } from '../../collections';

// External Imports
import { WebSocket } from 'ws';

// Lib Imports
import { SubscriptionCache } from '@sage3/backend';
import { APIClientWSMessage, ExtraImageType, ExtraPDFType } from '@sage3/shared/types';
import { SBAuthSchema } from '@sage3/sagebase';
import { isCSV, isImage, isPDF, isText, isJSON, isVideo, isDZI, isGeoJSON, isPython, isGLTF, isGIF, isPythonNotebook } from '@sage3/shared';
import { initialValues } from '@sage3/applications/initialValues';

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
  const assetFolder = config.public;
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
      const now = new Date().toISOString();
      // Process the file (metadata, image, pdf, etc.)

      MessageCollection.add({ type: 'info', payload: `Processing file ${elt.originalname}...` }, 'sage3');

      const newdata = await AssetsCollection.processFile(getUUID(), elt.filename, elt.mimetype);
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
          dateCreated: now,
          dateAdded: now,
          ...newdata,
        },
        user.id
      );

      // If we need to open the file, do it
      if (openFIles && assetID) {
        if (isImage(elt.mimetype)) {
          if (isGIF(elt.mimetype)) {
            // Get metadata information about the image
            const width = 300;
            const height = 300;
            // Just open it by URL
            AppsCollection.add(
              {
                name: 'ImageViewer',
                description: 'Image',
                roomId: req.body.room,
                boardId: req.body.board,
                ownerId: user.id,
                position: { x: posx - width / 2, y: ty - height / 2, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'ImageViewer',
                state: { ...initialValues['ImageViewer'], assetid: `/api/assets/static/${elt.filename}` },
                minimized: false,
                raised: false,
              },
              user.id
            );
            posx += width + 10;
          } else {
            // Get metadata information about the image
            const derived = newdata.derived as ExtraImageType;
            const ar = derived.aspectRatio || 1;
            const width = tw || 300;
            const height = th || width / ar;
            AppsCollection.add(
              {
                name: 'ImageViewer',
                description: 'Image',
                roomId: req.body.room,
                boardId: req.body.board,
                ownerId: user.id,
                position: { x: posx - width / 2, y: ty - height / 2, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'ImageViewer',
                state: { ...initialValues['ImageViewer'], assetid: assetID },
                minimized: false,
                raised: false,
              },
              user.id
            );
            posx += width + 10;
          }
        } else if (isPDF(elt.mimetype)) {
          // Get metadata information about the PDF
          const derived = newdata.derived as ExtraPDFType;
          const firstPage = derived[0];
          const ar = firstPage[0].width / firstPage[0].height;
          const width = tw || 500;
          const height = th || width / ar;
          AppsCollection.add(
            {
              name: 'PDFViewer',
              description: 'PDF',
              roomId: req.body.room,
              boardId: req.body.board,
              ownerId: user.id,
              position: { x: posx - width / 2, y: ty - height / 2, z: 0 },
              size: { width, height, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'PDFViewer',
              state: { ...initialValues['PDFViewer'], assetid: assetID },
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
              description: 'CSV',
              roomId: req.body.room,
              boardId: req.body.board,
              ownerId: user.id,
              position: { x: posx - w / 2, y: ty - h / 2, z: 0 },
              size: { width: w, height: h, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'CSVViewer',
              state: { ...initialValues['CSVViewer'], assetid: assetID },
              minimized: false,
              raised: false,
            },
            user.id
          );
          posx += tw || 800;
          posx += 10;
        } else if (isVideo(elt.mimetype)) {
          const w = tw || 800;
          const h = th || 450;
          AppsCollection.add(
            {
              name: 'VideoViewer',
              description: elt.originalname,
              roomId: req.body.room,
              boardId: req.body.board,
              ownerId: user.id,
              position: { x: posx - w / 2, y: ty - h / 2, z: 0 },
              size: { width: w, height: h, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'VideoViewer',
              state: { ...initialValues['VideoViewer'], assetid: assetID },
              minimized: false,
              raised: false,
            },
            user.id
          );
          posx += tw || 800;
          posx += 10;
        } else if (isDZI(elt.mimetype)) {
          const w = tw || 800;
          const h = th || 400;
          AppsCollection.add(
            {
              name: 'DeepZoomImage',
              description: 'DeepZoomImage',
              roomId: req.body.room,
              boardId: req.body.board,
              ownerId: user.id,
              position: { x: posx - w / 2, y: ty - h / 2, z: 0 },
              size: { width: w, height: h, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'DeepZoomImage',
              state: { assetid: assetID, zoomCenter: [0.5, 0.5], zoomLevel: 1 },
              minimized: false,
              raised: false,
            },
            user.id
          );
          posx += tw || 800;
          posx += 10;
        } else if (isGLTF(elt.mimetype)) {
          const w = tw || 600;
          const h = th || 600;
          AppsCollection.add(
            {
              name: 'GLTFViewer',
              description: 'GLTF',
              roomId: req.body.room,
              boardId: req.body.board,
              ownerId: user.id,
              position: { x: posx - w / 2, y: ty - h / 2, z: 0 },
              size: { width: w, height: h, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'GLTFViewer',
              state: { assetid: assetID },
              minimized: false,
              raised: false,
            },
            user.id
          );
          posx += tw || 800;
          posx += 10;
        } else if (isGeoJSON(elt.mimetype)) {
          const w = tw || 500;
          const h = th || 500;
          AppsCollection.add(
            {
              name: 'LeafLet',
              description: 'LeafLet',
              roomId: req.body.room,
              boardId: req.body.board,
              ownerId: user.id,
              position: { x: posx - w / 2, y: ty - h / 2, z: 0 },
              size: { width: w, height: h, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'LeafLet',
              state: { assetid: assetID, zoom: 13, location: [21.3, -157.8], baseLayer: 'OpenStreetMap', overlay: true },
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
              state: {
                ...initialValues['Stickie'],
                fontSize: 48,
                color: '#63B3ED',
                text: text.toString(),
                executeInfo: { executeFunc: '', params: {} },
              },
              minimized: false,
              raised: false,
            },
            user.id
          );
          posx += tw || 400;
          posx += 10;
        } else if (isPython(elt.mimetype)) {
          const text = fs.readFileSync(elt.path);
          const w = tw || 400;
          const h = th || 400;
          AppsCollection.add(
            {
              name: 'CodeCell',
              description: 'CodeCell',
              roomId: req.body.room,
              boardId: req.body.board,
              ownerId: user.id,
              position: { x: posx - w / 2, y: ty - h / 2, z: 0 },
              size: { width: w, height: h, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'CodeCell',
              state: {
                ...initialValues['CodeCell'],
                code: text.toString(),
              },
              minimized: false,
              raised: false,
            },
            user.id
          );
          posx += tw || 400;
          posx += 10;
        } else if (isPythonNotebook(elt.mimetype)) {
          // Read the file
          const text = fs.readFileSync(elt.path);
          const w = tw || 700;
          const h = th || 700;

          // Open the redis connection
          const client = createClient({ url: config.redis.url });
          await client.connect();
          const token = await client.get('config:jupyter:token');
          console.log('REDIS> token:', token);

          // Create a notebook file in Jupyter with the content of the file
          if (token) {
            // Create a new notebook
            let base: string;
            if (config.production) {
              base = 'https://jupyter:4443';
            } else {
              base = 'http://localhost';
            }
            // Talk to the jupyter server API
            const j_url = base + '/api/contents/notebooks/' + elt.originalname;
            const payload = { type: 'notebook', path: '/notebooks', format: 'json', content: JSON.parse(text.toString()) };
            // Create a new notebook
            fetch(j_url, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Token ' + token,
              },
              body: JSON.stringify(payload),
            })
              .then((response) => response.json())
              .then((data) => {
                console.log('Jupyter> notebook created', data);
                // Create the app
                AppsCollection.add(
                  {
                    name: 'JupyterLab',
                    description: 'JupyterLab',
                    roomId: req.body.room,
                    boardId: req.body.board,
                    ownerId: user.id,
                    position: { x: posx - w / 2, y: ty - h / 2, z: 0 },
                    size: { width: w, height: h, depth: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    type: 'JupyterLab',
                    state: {
                      ...initialValues['JupyterLab'],
                      notebook: elt.originalname,
                    },
                    minimized: false,
                    raised: false,
                  },
                  user.id
                );
                posx += tw || 400;
                posx += 10;
              });
          }
        } else if (isJSON(elt.mimetype)) {
          const text = fs.readFileSync(elt.path);
          const w = tw || 500;
          const h = th || 600;
          AppsCollection.add(
            {
              name: 'VegaLite',
              description: elt.originalname,
              roomId: req.body.room,
              boardId: req.body.board,
              ownerId: user.id,
              position: { x: posx - w / 2, y: ty - h / 2, z: 0 },
              size: { width: w, height: h, depth: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              type: 'VegaLite',
              state: { ...initialValues['VegaLite'], spec: text.toString() },
              minimized: false,
              raised: false,
            },
            user.id
          );
          posx += tw || 500;
          posx += 10;
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
  user: SBAuthSchema,
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

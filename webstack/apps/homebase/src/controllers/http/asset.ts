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

import { config } from '../../config';

// Local storage
import { uploadMiddleware } from '../../connectors/upload-connector';

// Asset model
import { AssetModel } from '../../models';

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

    // Do something with the files
    files.forEach((elt) => {
      console.log('FileUpload>', elt.originalname, elt.mimetype, elt.filename, elt.size);
      // Put the new file into the collection
      AssetModel.addAsset({
        file: elt.filename,
        owner: 'luc',
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

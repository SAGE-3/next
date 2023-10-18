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
// Mime type definitions
import * as mime from 'mime';
import { decode as decode8 } from 'utf8';
import { v4 as getUUID } from 'uuid';
// Local storage
import { uploadMiddleware } from '../../../connectors/upload-connector';

// Asset model
import { AssetsCollection, MessageCollection } from '../../collections';

// Lib Imports
import { SBAuthSchema } from '@sage3/sagebase';
import { config } from 'apps/homebase/src/config';
import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';

// Google storage and AWS S3 storage
// import { multerGoogleMiddleware, multerS3Middleware } from './middleware-upload';
const assetsPath = path.join('dist', 'apps', 'homebase', 'assets');

export function uploadHandler(req: express.Request, res: express.Response) {
  return uploadMiddleware('files')(req, res, async (err) => {
    let hasError = false;
    let processError = '';
    // multerGoogleMiddleware("files")(req, res, (err) => {
    // multerS3Middleware("files")(req, res, (err) => {
    if (err) {
      console.log('multerMiddleware>', err.message);
      hasError = true;
      processError = err.message;
      return res.status(500).send(processError);
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
        id: string;
      }>;
    };

    // Get the current uploader information
    const user = req.user as SBAuthSchema;

    // Send message to clients
    MessageCollection.add({ type: 'upload', payload: `Upload done` }, user.id);
    // Do something with the files
    for await (const elt of files) {
      console.log(elt.path, 'path');
      console.log(elt);
      elt.originalname = decode8(elt.originalname);
      console.log('FileUpload>', elt.originalname, elt.mimetype, elt.filename, elt.size);
      // Normalize mime types using the mime package
      elt.mimetype = mime.getType(elt.originalname) || elt.mimetype;
      // Put the new file into the collection
      const now = new Date().toISOString();
      // Process the file for metadata
      const mdata = await AssetsCollection.metadataFile(getUUID(), elt.filename, elt.mimetype).catch((e) => {
        processError = e.message as string;
        hasError = true;
        return;
      });
      // Process image and pdf
      const pdata = await AssetsCollection.processFile(getUUID(), elt.filename, elt.mimetype).catch((e) => {
        processError = e.message as string;
        hasError = true;
        return;
      });
      if (mdata) {
        // Send message to clients
        await MessageCollection.add({ type: 'process', payload: `Processing done for ${elt.originalname}` }, user.id);
        // Add the new file to the collection
        const newAsset = await AssetsCollection.add(
          {
            file: elt.filename,
            owner: user.id || '-',
            room: req.body.room || '-',
            originalfilename: elt.originalname,
            path: elt.path,
            destination: elt.destination,
            size: elt.size,
            mimetype: elt.mimetype,
            dateAdded: now,
            derived: pdata || {},
            ...mdata,
          },
          user.id
        );
        if (newAsset) {
          // save the id of the asset in the file object, sent back to the client
          elt.id = newAsset._id;
        }
      }
    }

    if (hasError && processError) {
      // Return error with the information
      res.status(500).send(processError);
    } else {
      // Return success with the information
      res.status(200).send(files);
    }
  });
}

export async function uploadByURLHandler(req: express.Request, res: express.Response): Promise<void> {
  const { user, body } = req as any as { user: SBAuthSchema; body: { url: string } };
  const url = body.url;
  const response = await fetch(url);
  const blob = await response.blob();
  const filename = url.split('/').pop() as string;
  let mimetype = blob.type;
  const size = blob.size;
  let processError = '';
  let hasError = false;
  const uuid = getUUID();
  const contentType = response.headers.get('content-type');
  if (contentType && response.body) {
    const extension = mime.getExtension(contentType);

    const assetPath = path.join(config.public, uuid + '.' + extension);

    const buffer = await blob.arrayBuffer();

    fs.writeFileSync(assetPath, Buffer.from(buffer));

    let file = {
      originalname: uuid + '.' + extension,
      mimetype: mimetype,
      filename: filename,
      destination: config.public,
      path: assetPath,
      size: size,
      id: uuid,
    };

    // Do something with the files
    // file.originalname = decode8(file.filename);
    console.log('FileUpload>', file.originalname, file.mimetype, file.filename, file.size);
    // Normalize mime types using the mime package
    mimetype = mime.getType(file.originalname) || file.mimetype;
    // Put the new file into the collection
    const now = new Date().toISOString();
    // Process the file for metadata
    const mdata = await AssetsCollection.metadataFile(getUUID(), file.originalname, file.mimetype).catch((e) => {
      processError = e.message as string;
      hasError = true;
      return;
    });
    // // Process image and pdf
    const pdata = await AssetsCollection.processFile(getUUID(), file.originalname, file.mimetype).catch((e) => {
      processError = e.message as string;
      hasError = true;
      return;
    });
    if (mdata) {
      console.log(mdata);
      // Send message to clients
      await MessageCollection.add({ type: 'process', payload: `Processing done for ${file.originalname}` }, user.id);
      // Add the new file to the collection
      const newAsset = await AssetsCollection.add(
        {
          file: file.filename,
          owner: user.id || '-',
          room: req.body.room || '-',
          originalfilename: file.originalname,
          path: file.path,
          destination: file.destination,
          size: file.size,
          mimetype: file.mimetype,
          dateAdded: now,
          derived: pdata || {},
          ...mdata,
        },
        user.id
      );
      if (newAsset) {
        // save the id of the asset in the file object, sent back to the client
        file.id = newAsset._id;
      }
    }

    if (hasError && processError) {
      // Return error with the information
      res.status(500).send(processError);
    } else {
      // Return success with the information
      res.status(200).send(file);
    }
  }
}

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

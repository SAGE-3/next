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

// Google storage and AWS S3 storage
// import { multerGoogleMiddleware, multerS3Middleware } from './middleware-upload';

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

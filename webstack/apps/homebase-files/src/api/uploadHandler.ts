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
import { decode as decode8 } from 'utf8';
import { v4 as getUUID } from 'uuid';

// Lib Imports
import { SBAuthSchema } from '@sage3/sagebase';
import { getFileType } from '@sage3/shared';
// Local storage
import { UploadConnector } from '../connectors/upload-connector';
// Asset model
import { AssetsCollection } from './assetsCollection';
import { MessageCollection } from './messageCollection';
import { AssetSchema } from '@sage3/shared/types';

// Google storage and AWS S3 storage
// import { multerGoogleMiddleware, multerS3Middleware } from './middleware-upload';

export async function uploadHandler(req: express.Request, res: express.Response) {
  // Signal the start of the upload
  await MessageCollection.add({ type: 'upload', payload: `Uploading Assets`, close: false }, req.user.id);

  return UploadConnector.getInstance().uploadMiddleware('files')(req, res, async (err) => {
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

    // Signal the start of the processing
    await MessageCollection.add({ type: 'upload', payload: `Processing Assets`, close: false }, user.id);

    const newAssets: AssetSchema[] = [];
    const newIds: string[] = [];

    // Do something with the files
    for await (const elt of files) {
      elt.originalname = decode8(elt.originalname);
      console.log('FileUpload>', elt.originalname, elt.mimetype, elt.filename, elt.size);
      // Normalize mime types using the mime package
      elt.mimetype = getFileType(elt.originalname) || elt.mimetype;
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
        // Signal the end of processing of the file
        await MessageCollection.add({ type: 'process', payload: `Processing done for ${elt.originalname}`, close: false }, user.id);
        // Add the new file to a buffer
        newAssets.push({
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
        });
      }
    }

    // Add all the new files to the collection
    const lots = await AssetsCollection.addBatch(newAssets, user.id);
    if (lots) {
      // Collect the ids of the new files
      const ids = lots.map((l) => l._id);
      newIds.push(...ids);
    }

    // Signal the end of the processing
    await MessageCollection.add({ type: 'upload', payload: `Assets Ready`, close: true }, user.id);

    if (hasError && processError) {
      // Return error with the information
      res.status(500).send(processError);
    } else {
      // Return success with the ids of the new files
      res.status(200).send(newIds);
    }
  });
}

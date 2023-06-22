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
import * as fs from 'fs';
import { decode as decode8 } from 'utf8';
import { v4 as getUUID } from 'uuid';
import { createClient } from 'redis';
// HTTPS requests
import axios from 'axios';
import * as https from 'https';

import { config } from '../../../config';

// Local storage
import { uploadMiddleware } from '../../../connectors/upload-connector';

// Asset model
import { AssetsCollection, AppsCollection, MessageCollection, UsersCollection } from '../../collections';

// Lib Imports
import { ExtraImageType, ExtraPDFType, ExtraVideoType } from '@sage3/shared/types';
import { SBAuthSchema } from '@sage3/sagebase';
import {
  isCSV,
  isImage,
  isPDF,
  isMD,
  isJSON,
  isVideo,
  isDZI,
  isGeoJSON,
  isPython,
  isGLTF,
  isGIF,
  isPythonNotebook,
  isText,
} from '@sage3/shared';
import { initialValues } from '@sage3/applications/initialValues';

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
      }>;
    };

    let openFIles = false;
    let tx = 0;
    let ty = 0;
    let tw = 0;
    let th = 0;
    let posx = 0;
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

    // Send message to clients
    MessageCollection.add({ type: 'upload', payload: `Upload done` }, user.id);

    // Do something with the files
    for await (const elt of files) {
      // files.forEach(async (elt, idx) => {
      elt.originalname = decode8(elt.originalname);
      console.log('FileUpload>', elt.originalname, elt.mimetype, elt.filename, elt.size);
      // Normalize mime types using the mime package
      elt.mimetype = mime.getType(elt.originalname) || elt.mimetype;
      // Put the new file into the collection
      const now = new Date().toISOString();
      // Process the file (metadata, image, pdf, etc.)
      const newdata = await AssetsCollection.processFile(getUUID(), elt.filename, elt.mimetype).catch((e) => {
        processError = e.message as string;
        hasError = true;
        return;
      });
      if (newdata) {
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
            // dateCreated: now,
            dateAdded: now,
            ...newdata,
          },
          user.id
        );

        // If we need to open the file, do it
        if (openFIles && newAsset) {
          // Send message to clients
          if (isText(elt.mimetype)) {
            await MessageCollection.add({ type: 'warning', payload: `No application to open ${elt.originalname}` }, user.id);
          } else {
            await MessageCollection.add({ type: 'open', payload: `Opening application for ${elt.originalname}` }, user.id);
          }

          if (isImage(elt.mimetype)) {
            if (isGIF(elt.mimetype)) {
              // Get metadata information about the image
              const width = 300;
              const height = 300;
              // Just open it by URL
              await AppsCollection.add(
                {
                  title: elt.originalname,
                  roomId: req.body.room,
                  boardId: req.body.board,
                  position: { x: posx, y: ty - height / 2, z: 0 },
                  size: { width, height, depth: 0 },
                  rotation: { x: 0, y: 0, z: 0 },
                  type: 'ImageViewer',
                  state: { ...initialValues['ImageViewer'], assetid: `/api/assets/static/${elt.filename}` },
                  raised: false,
                  dragging: false,
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
              await AppsCollection.add(
                {
                  title: elt.originalname,
                  roomId: req.body.room,
                  boardId: req.body.board,
                  position: { x: posx, y: ty - height / 2, z: 0 },
                  size: { width, height, depth: 0 },
                  rotation: { x: 0, y: 0, z: 0 },
                  type: 'ImageViewer',
                  state: { ...initialValues['ImageViewer'], assetid: newAsset._id },
                  raised: false,
                  dragging: false,
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
            await AppsCollection.add(
              {
                title: elt.originalname,
                roomId: req.body.room,
                boardId: req.body.board,
                position: { x: posx, y: ty - height / 2, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'PDFViewer',
                state: { ...initialValues['PDFViewer'], assetid: newAsset._id },
                raised: false,
                dragging: false,
              },
              user.id
            );
            posx += width + 10;
          } else if (isCSV(elt.mimetype)) {
            const width = tw || 800;
            const height = th || 400;
            await AppsCollection.add(
              {
                title: elt.originalname,
                roomId: req.body.room,
                boardId: req.body.board,
                position: { x: posx, y: ty - height / 2, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'CSVViewer',
                state: { ...initialValues['CSVViewer'], assetid: newAsset._id },
                raised: false,
                dragging: false,
              },
              user.id
            );
            posx += width + 10;
          } else if (isVideo(elt.mimetype)) {
            const derived = newdata.derived as ExtraVideoType;
            let width = tw || 800;
            let height = th || 450;
            if (derived.aspectRatio) {
              if (derived.aspectRatio > 1) {
                height = Math.round(width / derived.aspectRatio);
              } else {
                width = Math.round(height * derived.aspectRatio);
              }
            }
            await AppsCollection.add(
              {
                title: elt.originalname,
                roomId: req.body.room,
                boardId: req.body.board,
                position: { x: posx, y: ty - height / 2, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'VideoViewer',
                state: { ...initialValues['VideoViewer'], assetid: newAsset._id },
                raised: false,
                dragging: false,
              },
              user.id
            );
            posx += width + 10;
          } else if (isDZI(elt.mimetype)) {
            const width = tw || 800;
            const height = th || 400;
            await AppsCollection.add(
              {
                title: elt.originalname,
                roomId: req.body.room,
                boardId: req.body.board,
                position: { x: posx, y: ty - height / 2, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'DeepZoomImage',
                state: { assetid: newAsset._id, zoomCenter: [0.5, 0.5], zoomLevel: 1 },
                raised: false,
                dragging: false,
              },
              user.id
            );
            posx += width + 10;
          } else if (isGLTF(elt.mimetype)) {
            const width = tw || 600;
            const height = th || 600;
            await AppsCollection.add(
              {
                title: elt.originalname,
                roomId: req.body.room,
                boardId: req.body.board,
                position: { x: posx, y: ty - height / 2, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'GLTFViewer',
                state: { assetid: newAsset._id },
                raised: false,
                dragging: false,
              },
              user.id
            );
            posx += width + 10;
          } else if (isGeoJSON(elt.mimetype)) {
            const width = tw || 500;
            const height = th || 500;
            await AppsCollection.add(
              {
                title: elt.originalname,
                roomId: req.body.room,
                boardId: req.body.board,
                position: { x: posx, y: ty - height / 2, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'MapGL',
                state: { assetid: newAsset._id, zoom: 13, location: [-157.8, 21.3], baseLayer: 'OpenStreetMap', overlay: true },
                raised: false,
                dragging: false,
              },
              user.id
            );
            posx += width + 10;
          } else if (isMD(elt.mimetype)) {
            const text = fs.readFileSync(elt.path);
            const width = tw || 400;
            const height = th || 420;
            const u = await UsersCollection.get(req.user.id);
            await AppsCollection.add(
              {
                title: u ? u.data.name : 'Unknown',
                roomId: req.body.room,
                boardId: req.body.board,
                position: { x: posx, y: ty - height / 2, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'Stickie',
                state: {
                  ...initialValues['Stickie'],
                  fontSize: 48,
                  color: '#63B3ED',
                  text: text.toString(),
                  executeInfo: { executeFunc: '', params: {} },
                },
                raised: false,
                dragging: false,
              },
              user.id
            );
            posx += width + 10;
          } else if (isPython(elt.mimetype)) {
            const text = fs.readFileSync(elt.path);
            const width = tw || 400;
            const height = th || 400;
            await AppsCollection.add(
              {
                title: elt.originalname,
                roomId: req.body.room,
                boardId: req.body.board,
                position: { x: posx, y: ty - height / 2, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'SageCell',
                state: {
                  ...initialValues['SageCell'],
                  code: text.toString(),
                },
                raised: false,
                dragging: false,
              },
              user.id
            );
            posx += width + 10;
          } else if (isPythonNotebook(elt.mimetype)) {
            // Read the file
            const text = fs.readFileSync(elt.path);
            const width = tw || 700;
            const height = th || 700;

            // Open the redis connection
            const client = createClient({ url: config.redis.url });
            await client.connect();
            const token = await client.get('config:jupyter:token');

            // Create a notebook file in Jupyter with the content of the file
            if (token) {
              // Create a new notebook
              let base: string;
              if (config.production) {
                base = 'https://jupyter:8888';
              } else {
                base = 'http://localhost';
              }
              // Talk to the jupyter server API
              const j_url = base + '/api/contents/notebooks/' + elt.originalname;
              const payload = { type: 'notebook', path: '/notebooks', format: 'json', content: JSON.parse(text.toString()) };
              const agent = new https.Agent({ rejectUnauthorized: false });
              // Create a new notebook
              axios({
                url: j_url,
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Token ' + token,
                },
                httpsAgent: agent,
                data: JSON.stringify(payload),
              })
                // .then((response) => response.json())
                .then((data) => {
                  console.log('Jupyter> notebook created', data.statusText);
                  // Create the app
                  AppsCollection.add(
                    {
                      title: elt.originalname,
                      roomId: req.body.room,
                      boardId: req.body.board,
                      position: { x: posx, y: ty - height / 2, z: 0 },
                      size: { width, height, depth: 0 },
                      rotation: { x: 0, y: 0, z: 0 },
                      type: 'JupyterLab',
                      state: {
                        ...initialValues['JupyterLab'],
                        notebook: elt.originalname,
                      },
                      raised: false,
                      dragging: false,
                    },
                    user.id
                  );
                  posx += tw || 400;
                  posx += 10;
                })
                .catch((e: Error) => {
                  console.log('Jupyter> error', e);
                });
            }
          } else if (isJSON(elt.mimetype)) {
            const text = fs.readFileSync(elt.path);
            const width = tw || 500;
            const height = th || 600;
            await AppsCollection.add(
              {
                title: elt.originalname,
                roomId: req.body.room,
                boardId: req.body.board,
                position: { x: posx, y: ty - height / 2, z: 0 },
                size: { width, height, depth: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                type: 'VegaLite',
                state: { ...initialValues['VegaLite'], spec: text.toString() },
                raised: false,
                dragging: false,
              },
              user.id
            );
            posx += width + 10;
          }
        }
      }
    }
    if (hasError && processError) {
      // Return error with the information
      return res.status(500).send(processError);
    } else {
      // Return success with the information
      return res.status(200).send(files);
    }
  });
}

/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
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
import express from 'express';
import { decode as decode8 } from 'utf8';
import { v4 as getUUID } from 'uuid';

// Lib Imports
import { SBAuthSchema } from '@sage3/sagebase';
import { getFileType } from '@sage3/shared';
// Local storage
import { UploadConnector } from '../connectors/upload-connector';
// Asset model
import { AssetsCollection } from './assetsCollection';
import { addUploadMessage } from './messageCollection';
import { AssetSchema } from '@sage3/shared/types';
import { toPluginAsset } from '@sage3/backend';
import { PluginAssetRequestError } from './plugin-asset-access';

// Google storage and AWS S3 storage
// import { multerGoogleMiddleware, multerS3Middleware } from './middleware-upload';

export async function uploadHandler(req: express.Request, res: express.Response) {
  return handleUpload(req, res);
}

export async function uploadPluginAsset(req: express.Request, res: express.Response, pluginRoomId: string) {
  return handleUpload(req, res, pluginRoomId);
}

async function handleUpload(req: express.Request, res: express.Response, pluginRoomId?: string) {
  const uploadId = getUUID();
  const headerRoomId = pluginRoomId ?? (req.header('x-sage3-room') || undefined);
  // Signal the start of the upload
  await addUploadMessage(req.user.id, `Uploading Assets`, { uploadId, roomId: headerRoomId, phase: 'uploading' });

  const connector = UploadConnector.getInstance();
  const middleware = pluginRoomId ? connector.pluginUploadMiddleware() : connector.uploadMiddleware('files');
  let persisted = false;

  const processFiles = async (err?: { message: string; code?: string }) => {
    let hasError = false;
    let processError = '';
    // multerGoogleMiddleware("files")(req, res, (err) => {
    // multerS3Middleware("files")(req, res, (err) => {
    if (err) {
      console.log('multerMiddleware>', err.message);
      hasError = true;
      processError = err.message;
      await addUploadMessage(req.user.id, `Upload failed: ${processError}`, { uploadId, roomId: headerRoomId, phase: 'failed', close: true });
      if (pluginRoomId) {
        return res
          .status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
          .json({ error: 'Upload rejected. Supply one file within the upload limit.' });
      }
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
    if (pluginRoomId && files?.length !== 1) {
      throw new PluginAssetRequestError('Supply exactly one file.');
    }

    // Get the current uploader information
    const user = req.user as SBAuthSchema;
    const roomId = pluginRoomId ?? (req.body.room || headerRoomId || '-');
    const messageRoomId = roomId === '-' ? undefined : roomId;

    // Signal the start of the processing
    await addUploadMessage(user.id, `Processing Assets`, { uploadId, roomId: messageRoomId, phase: 'processing' });

    const newAssets: AssetSchema[] = [];
    const newAssetMessages: { fileId: string; filename: string }[] = [];
    const newIds: string[] = [];

    // Do something with the files
    for await (const elt of files) {
      let fileHasError = false;
      elt.originalname = decode8(elt.originalname);
      console.log('FileUpload>', elt.originalname, elt.mimetype, elt.filename, elt.size);
      const fileMessageId = getUUID();
      // Normalize mime types using the mime package
      elt.mimetype = getFileType(elt.originalname) || elt.mimetype;
      // Put the new file into the collection
      const now = new Date().toISOString();
      await addUploadMessage(user.id, `Processing ${elt.originalname}`, {
        uploadId,
        fileId: fileMessageId,
        roomId: messageRoomId,
        filename: elt.originalname,
        phase: 'metadata',
      });
      // Process the file for metadata
      const mdata = await AssetsCollection.metadataFile(getUUID(), elt.filename, elt.mimetype).catch((e) => {
        processError = e instanceof Error ? e.message : String(e);
        hasError = true;
        fileHasError = true;
        return;
      });
      if (fileHasError) {
        await addUploadMessage(user.id, `Processing failed for ${elt.originalname}: ${processError}`, {
          uploadId,
          fileId: fileMessageId,
          roomId: messageRoomId,
          filename: elt.originalname,
          phase: 'failed',
          close: true,
        });
        continue;
      }
      // Process image and pdf
      const pdata = await AssetsCollection.processFile(
        getUUID(),
        elt.filename,
        elt.mimetype,
        user.id,
        elt.originalname,
        uploadId,
        fileMessageId,
        messageRoomId,
      ).catch((e) => {
        processError = e instanceof Error ? e.message : String(e);
        hasError = true;
        fileHasError = true;
        return;
      });
      if (fileHasError) {
        await addUploadMessage(user.id, `Processing failed for ${elt.originalname}: ${processError}`, {
          uploadId,
          fileId: fileMessageId,
          roomId: messageRoomId,
          filename: elt.originalname,
          phase: 'failed',
          close: true,
        });
        continue;
      }
      if (mdata) {
        await addUploadMessage(user.id, `Finalizing ${elt.originalname}`, {
          uploadId,
          fileId: fileMessageId,
          roomId: messageRoomId,
          filename: elt.originalname,
          phase: 'processing',
        });
        // Add the new file to a buffer
        newAssets.push({
          file: elt.filename,
          owner: user.id || '-',
          room: roomId,
          originalfilename: elt.originalname,
          path: elt.path,
          destination: elt.destination,
          size: elt.size,
          mimetype: elt.mimetype,
          dateAdded: now,
          derived: pdata || {},
          ...mdata,
        });
        newAssetMessages.push({ fileId: fileMessageId, filename: elt.originalname });
      }
    }

    // Add all the new files to the collection
    if (pluginRoomId && (hasError || newAssets.length !== 1)) {
      throw new PluginAssetRequestError('Asset processing failed.', 500);
    }

    const lots = await AssetsCollection.addBatch(newAssets, user.id);
    if (pluginRoomId && lots?.length !== 1) {
      throw new PluginAssetRequestError('Asset could not be saved.', 500);
    }

    persisted = Boolean(lots?.length);
    if (lots) {
      // Collect the ids of the new files
      const ids = lots.map((l) => l._id);
      newIds.push(...ids);
      for (const [index, lot] of lots.entries()) {
        const fileMessage = newAssetMessages[index];
        if (!fileMessage) continue;
        await addUploadMessage(user.id, `Processing done for ${fileMessage.filename}`, {
          uploadId,
          fileId: fileMessage.fileId,
          roomId: messageRoomId,
          assetId: lot._id,
          filename: fileMessage.filename,
          phase: 'ready',
          progress: { current: 1, total: 1, percent: 100, unit: 'files' },
          close: true,
        });
      }
    }

    if (hasError && processError) {
      await addUploadMessage(user.id, `Upload failed: ${processError}`, { uploadId, roomId: messageRoomId, phase: 'failed', close: true });
      // Return error with the information
      res.status(500).send(processError);
    } else {
      // Signal the end of the processing
      await addUploadMessage(user.id, `Assets Ready`, {
        uploadId,
        roomId: messageRoomId,
        phase: 'ready',
        progress: { current: newIds.length, total: files.length, percent: 100, unit: 'files' },
        close: true,
      });
      // Return success with the ids of the new files
      res.status(200).send(pluginRoomId && lots?.[0] ? toPluginAsset(lots[0]) : newIds);
    }
  };

  return middleware(req, res, (err) => {
    void processFiles(err).catch((error) => {
      if (pluginRoomId && !persisted) {
        const files = req.files as Express.Multer.File[] | undefined;
        AssetsCollection.deleteAssetFiles((files ?? []).map((file) => ({ file: file.filename })));
      }

      const status = error instanceof PluginAssetRequestError ? error.status : 500;
      const message = error instanceof PluginAssetRequestError ? error.message : 'Asset upload failed.';
      res.status(status).json({ error: message });
    });
  });
}

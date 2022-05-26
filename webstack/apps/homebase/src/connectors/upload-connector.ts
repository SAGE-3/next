/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Connector for Multer logging system.
 * Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files.
 * @file Multer Connector
 * @author <a href="mailto:renambot@gmail.com">Luc Renambot</a>
 * @version 1.0.0
 */

// Node nmodules
import * as path from 'path';

// NPM modules
import { v4 as getUUID } from 'uuid';
import * as express from 'express';
import * as multer from 'multer';

const upload = multer({
  storage: multer.diskStorage({
    // destination: function (req: Express.Request, file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) {
    destination: function (req, file, cb) {
      return cb(null, path.join(__dirname, 'assets/'));
    },
    // filename: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    filename: function (req, file, cb) {
      return cb(null, getUUID() + file.originalname.substring(file.originalname.lastIndexOf('.')));
    },
  }),
});

/**
 * Middleware connector for Multer.
 * @param fieldname Shared name of the multipart form fields to process.
 * @returns express.RequestHandler
 */
export function multerMiddleware(fieldname: string): express.RequestHandler {
  return upload.array(fieldname);
}

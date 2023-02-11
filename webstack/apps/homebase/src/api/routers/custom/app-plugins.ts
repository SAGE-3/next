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
import * as fs from 'fs';
// Node modules
import * as multer from 'multer';
import * as path from 'path';
// import { v4 as getUUID } from 'uuid';

import { Parse } from 'unzipper';

const pluginPath = `dist/apps/homebase/plugins/`;
const uploadPath = `${pluginPath}uploads/`;
const appsPath = `${pluginPath}apps/`;
const upload = multer({ dest: uploadPath });

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}
/**
 * App route/api express middleware.
 * @returns {express.Router} returns the express router object
 */
export function PluginRouter(): express.Router {
  const router = express.Router();
  // Serves the static react files from webapp folder

  router.post('/upload', upload.single('plugin'), (req) => {
    const file = req.file;
    if (file == undefined) return;
    const p = req.file?.path;
    if (p == undefined) return;
    try {
      fs.createReadStream(p)
        .pipe(Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          const type = entry.type; // 'Directory' or 'File'
          const size = entry.vars.uncompressedSize; // There is also compressedSize;
          console.log(fileName, type, size);
          if (type == 'File') {
            ensureDirectoryExistence(`${appsPath}${fileName}`);
            entry.pipe(fs.createWriteStream(`${appsPath}${fileName}`));
          }
        });
    } catch (e) {
      console.log(e);
    }
  });

  return router;
}

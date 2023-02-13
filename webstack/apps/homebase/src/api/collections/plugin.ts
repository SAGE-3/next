/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { PluginSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';

import * as fs from 'fs';
// Node modules
import * as multer from 'multer';
import * as path from 'path';
// import { v4 as getUUID } from 'uuid';

import { Parse } from 'unzipper';

const pluginPath = path.join('dist', 'apps', 'homebase', 'plugins');
const uploadPath = path.join(pluginPath, 'uploads');
const appsPath = path.join(pluginPath, 'apps');
const upload = multer({ dest: uploadPath });

class SAGE3PluginsCollection extends SAGE3Collection<PluginSchema> {
  constructor() {
    super('PLUGINS', {
      name: '',
    });

    const router = sageRouter<PluginSchema>(this);

    const createPluginDBRef = (name: string, uid: string) => {
      this.add({ name, creatorId: uid, dateCreated: Date.now().toString() }, uid);
    };

    // Upload a new Plugin App
    router.post('/upload', upload.single('plugin'), async (req) => {
      const file = req.file;
      const userId = req.user.id;
      if (file == undefined) return;
      const p = req.file?.path;
      if (p == undefined) return;
      let name: string | null = null;
      try {
        fs.createReadStream(p)
          .pipe(Parse())
          .on('entry', (entry) => {
            const fileName = entry.path;
            if (name == null) {
              name = fileName.split('/')[0];
              if (name) {
                createPluginDBRef(name, userId);
              }
            }
            const type = entry.type; // 'Directory' or 'File'
            const size = entry.vars.uncompressedSize; // There is also compressedSize;
            console.log(fileName, type, size);
            if (type == 'File') {
              const filename = path.join(appsPath, fileName);
              ensureDirectoryExistence(filename);
              entry.pipe(fs.createWriteStream(filename));
            }
          });
        // PluginsCollection.add({});
      } catch (e) {
        console.log('Plugins> upload error', e);
      }
    });

    this.httpRouter = router;
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

export const PluginsCollection = new SAGE3PluginsCollection();

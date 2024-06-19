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

import * as jszip from 'jszip';
import { isZip } from '@sage3/shared';

// Plugin Paths
const pluginPath = path.join('dist', 'apps', 'homebase', 'plugins');
const uploadPath = path.join(pluginPath, 'uploads');
const appsPath = path.join(pluginPath, 'apps');
const upload = multer({ dest: uploadPath });

class SAGE3PluginsCollection extends SAGE3Collection<PluginSchema> {
  constructor() {
    super('PLUGINS', {
      name: '',
      ownerId: '',
    });

    const router = sageRouter<PluginSchema>(this);

    // Check to see if the folders exists, If not create them
    ensureDirectoryExistence(pluginPath);
    ensureDirectoryExistence(uploadPath);
    ensureDirectoryExistence(appsPath);

    // Upload a new Plugin App
    router.post('/upload', upload.single('plugin'), async (req, res) => {
      // Check for file.
      const file = req.file;
      if (file == undefined) {
        res.status(400).send({ success: false, message: 'No file provided.' });
        return;
      }

      // Check for file type
      if (!isZip(file.mimetype)) {
        res.status(400).send({ success: false, message: 'Invalid file type. Only Zip Files.' });
        return;
      }

      // Get the filename to delete later
      const uploadName = req.file?.filename as string;
      const removeUploadedFile = () => {
        fs.rmSync(path.join(uploadPath, uploadName), { force: true });
      };

      // Get body information
      const pluginName = req.body.name as string;
      const description = req.body.description as string;
      const username = req.body.username as string;

      // Check if the request is valid
      if (!username || !description || !pluginName) {
        removeUploadedFile();
        res.status(400).send({ success: false, message: 'Invalid request format.' });
        return;
      }

      // Check to see if plugin with that name already exists
      const check = await this.collection.query('name', pluginName);
      if (check.length > 0) {
        removeUploadedFile();
        res.status(400).send({ success: false, message: 'Plugin with that name already exists.' });
        return;
      }

      // Make the directory
      ensureDirectoryExistence(path.join(appsPath, pluginName));

      const p = req.file?.path;
      if (p == undefined) {
        res.status(400).send({ success: false, message: 'Failed upload.' });
        return;
      }

      // Read the zip file
      try {
        fs.readFile(p, async (err, data) => {
          if (err) throw err;
          // Load the zip file
          let result: jszip;
          try {
            result = await jszip.loadAsync(data);
          } catch (e) {
            removeUploadedFile();
            res.status(500).send({ success: false, message: 'Error reading zip file.' });
            return;
          }

          // Extract keys
          const keys = Object.keys(result.files);

          let foundIndex = false;
          // Create the files
          for (const key of keys) {
            const item = result.files[key];
            // Replace the first directory with the plugin name
            const filePath = key.split('/');
            if (filePath[0] !== '' && filePath[0] !== '__MACOSX' && filePath[0] !== '.DS_Store') {
              if (filePath[1] !== '' && filePath[1] !== '.DS_Store') {
                if (filePath[1] === 'index.html') foundIndex = true;
                filePath[0] = pluginName;
                const truePAth = filePath.join('/');
                ensureDirectoryExistence(path.join(appsPath, truePAth));
                if (!item.dir) {
                  fs.writeFileSync(path.join(appsPath, truePAth), Buffer.from(await item.async('arraybuffer')));
                }
              }
            }
          }
          if (!foundIndex) {
            removeUploadedFile();
            fs.rmSync(path.join(appsPath, pluginName), { recursive: true, force: true });
            res.status(400).send({ success: false, message: 'Index.html not found' });
            return;
          }
          // Update the database
          this.add(
            { name: pluginName, description, ownerId: req.user.id, ownerName: username, dateCreated: Date.now().toString() },
            req.user.id
          );
          removeUploadedFile();
          res.status(200).send({ success: true, message: 'Plugin Uploaded' });
        });
      } catch (e) {
        removeUploadedFile();
        res.status(500).send({ success: false, message: 'Error reading zip file.' });
      }
    });

    // REMOVE: Remove the plugin db reference and the files locally.
    router.delete('/remove/:id', async ({ params }, res) => {
      const docRef = this.collection.docRef(params.id);
      const doc = await docRef.read();
      if (doc === undefined) {
        res.status(500).send({ success: false, message: 'Could not delete the plugin.' });
        return;
      }

      // Get Name of Plugin and remove directory
      const name = doc.data.name;
      fs.rmSync(path.join(appsPath, name), { recursive: true, force: true });

      // TODO Delete the document and the files
      const del = await this.delete(params.id);
      if (del) res.status(200).send({ success: true });
      else res.status(500).send({ success: false, message: 'Failed to delete document.' });
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

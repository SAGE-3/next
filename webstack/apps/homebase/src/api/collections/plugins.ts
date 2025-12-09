/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { PluginSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';

// Node modules
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as multer from 'multer';
import * as path from 'path';

import * as jszip from 'jszip';
import { isZip } from '@sage3/shared';

// Plugin Paths
const pluginPath = path.join('dist', 'apps', 'homebase', 'plugins');
const uploadPath = path.join(pluginPath, 'uploads');
const appsPath = path.join(pluginPath, 'apps');

// Maximum file size: 50MB for plugin ZIP files
const MAX_PLUGIN_SIZE = 50 * 1024 * 1024;
const upload = multer({
  dest: uploadPath,
  limits: { fileSize: MAX_PLUGIN_SIZE },
});

/**
 * Sanitize plugin name to prevent path traversal and invalid characters
 * Only allows alphanumeric characters, hyphens, and underscores
 */
function sanitizePluginName(name: string): string {
  // Remove any characters that aren't alphanumeric, hyphen, or underscore
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '');
  // Remove leading/trailing hyphens and underscores
  return sanitized.replace(/^[-_]+|[-_]+$/g, '');
}

/**
 * Validate that a plugin name is safe and not empty
 */
function validatePluginName(name: string): { valid: boolean; sanitized: string; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, sanitized: '', error: 'Plugin name cannot be empty' };
  }
  if (name.length > 100) {
    return { valid: false, sanitized: '', error: 'Plugin name cannot exceed 100 characters' };
  }
  const sanitized = sanitizePluginName(name);
  if (sanitized.length === 0) {
    return { valid: false, sanitized: '', error: 'Plugin name contains only invalid characters' };
  }
  return { valid: true, sanitized };
}

/**
 * Generate the folder name for a plugin using roomId_name format
 * This ensures plugins are scoped to rooms and allows same plugin names in different rooms
 */
function getPluginFolderName(roomId: string, pluginName: string): string {
  // Sanitize roomId (should be UUID, but sanitize just in case)
  const sanitizedRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `${sanitizedRoomId}_${pluginName}`;
}

class SAGE3PluginsCollection extends SAGE3Collection<PluginSchema> {
  constructor() {
    super('PLUGINS', {
      name: '',
      ownerId: '',
      roomId: '',
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
      const removeUploadedFile = async () => {
        try {
          await fsPromises.rm(path.join(uploadPath, uploadName), { force: true });
        } catch (err) {
          console.error('Error removing uploaded file:', err);
        }
      };

      // Get body information
      const rawPluginName = req.body.name as string;
      const description = req.body.description as string;
      const username = req.body.username as string;
      const roomId = req.body.roomId ? req.body.roomId : '';
      let foundPreviousVersion = false;
      let existingPluginId: string | undefined;

      // Validate plugin name
      const nameValidation = validatePluginName(rawPluginName);
      if (!nameValidation.valid) {
        await removeUploadedFile();
        res.status(400).send({ success: false, message: nameValidation.error || 'Invalid plugin name.' });
        return;
      }
      const pluginName = nameValidation.sanitized;

      // Check if the request is valid
      if (!username || !description || !pluginName || !roomId) {
        await removeUploadedFile();
        res.status(400).send({ success: false, message: 'Invalid request format.' });
        return;
      }

      // Check to see if plugin with that name already exists in this room
      // Plugins are unique per room (roomId + name combination)
      const check = await this.collection.query('name', pluginName);
      const existingPluginInRoom = check.find((p) => p.data.roomId === roomId);
      
      if (existingPluginInRoom) {
        // Check if the existing plugin is owned by the user
        if (existingPluginInRoom.data.ownerId !== req.user.id) {
          // If not yours, reject the upload - only the owner can update
          await removeUploadedFile();
          res.status(403).send({ 
            success: false, 
            message: 'A plugin with that name already exists in this room. Only the plugin owner can update it.' 
          });
          return;
        } else {
          // If it is yours, remove the old files and store the ID for update
          const folderName = getPluginFolderName(roomId, pluginName);
          try {
            await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true });
            foundPreviousVersion = true;
            existingPluginId = existingPluginInRoom._id;
          } catch (err) {
            console.error('Error removing old plugin files:', err);
            await removeUploadedFile();
            res.status(500).send({ success: false, message: 'Error removing old plugin files.' });
            return;
          }
        }
      }

      // Generate folder name using roomId_name format
      const folderName = getPluginFolderName(roomId, pluginName);
      // Make the directory
      ensureDirectoryExistence(path.join(appsPath, folderName));

      const p = req.file?.path;
      if (p == undefined) {
        res.status(400).send({ success: false, message: 'Failed upload.' });
        return;
      }

      // Read and process the zip file
      try {
        const data = await fsPromises.readFile(p);

        // Load the zip file
        let result: jszip;
        try {
          // Convert Buffer to Uint8Array for jszip
          result = await jszip.loadAsync(new Uint8Array(data));
        } catch (e) {
          await removeUploadedFile();
          res.status(500).send({ success: false, message: 'Error reading zip file. Invalid or corrupted ZIP file.' });
          return;
        }

        // Validate ZIP structure - check for reasonable number of files
        const keys = Object.keys(result.files);
        if (keys.length === 0) {
          await removeUploadedFile();
          await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true }).catch(() => {});
          res.status(400).send({ success: false, message: 'ZIP file is empty.' });
          return;
        }

        if (keys.length > 10000) {
          await removeUploadedFile();
          await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true }).catch(() => {});
          res.status(400).send({ success: false, message: 'ZIP file contains too many files (maximum 10,000).' });
          return;
        }

        let foundIndex = false;
        const extractPromises: Promise<void>[] = [];

        // Create the files
        for (const key of keys) {
          const item = result.files[key];
          // Replace the first directory with the folder name (roomId_name)
          const filePath = key.split('/');
          if (filePath[0] !== '' && filePath[0] !== '__MACOSX' && filePath[0] !== '.DS_Store') {
            if (filePath[1] !== '' && filePath[1] !== '.DS_Store') {
              if (filePath[1] === 'index.html') foundIndex = true;
              filePath[0] = folderName;
              // Join and normalize the path to handle any double slashes or edge cases
              let truePath = filePath.filter((p) => p !== '').join('/');
              truePath = path.normalize(truePath).replace(/\\/g, '/'); // Normalize and use forward slashes
              
              // Validate path doesn't contain path traversal attempts
              // Check for dangerous path components
              if (truePath.includes('..') || truePath.startsWith('/') || truePath.startsWith('\\')) {
                await removeUploadedFile();
                await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true }).catch(() => {});
                res.status(400).send({ success: false, message: 'Invalid file path in ZIP file.' });
                return;
              }
              
              // Resolve both paths to absolute and normalize them for comparison
              const resolvedAppsPath = path.resolve(appsPath);
              const fullPath = path.resolve(path.join(appsPath, truePath));
              const normalizedFullPath = path.normalize(fullPath);
              const normalizedAppsPath = path.normalize(resolvedAppsPath);
              
              // Ensure the full path is within the apps directory
              if (!normalizedFullPath.startsWith(normalizedAppsPath + path.sep) && normalizedFullPath !== normalizedAppsPath) {
                await removeUploadedFile();
                await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true }).catch(() => {});
                res.status(400).send({ success: false, message: 'Invalid file path in ZIP file.' });
                return;
              }

              ensureDirectoryExistence(fullPath);
              if (!item.dir) {
                extractPromises.push(
                  item.async('arraybuffer').then(async (buffer) => {
                    await fsPromises.writeFile(fullPath, new Uint8Array(buffer));
                  })
                );
              }
            }
          }
        }

        // Wait for all files to be extracted
        try {
          await Promise.all(extractPromises);
        } catch (extractErr) {
          await removeUploadedFile();
          await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true }).catch(() => {});
          res.status(500).send({ success: false, message: 'Error extracting ZIP file.' });
          return;
        }

        if (!foundIndex) {
          await removeUploadedFile();
          await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true }).catch(() => {});
          res.status(400).send({ success: false, message: 'Index.html not found in ZIP file.' });
          return;
        }

        // Update the database
        if (foundPreviousVersion && existingPluginId) {
          // Update existing plugin entry
          try {
            await this.update(
              existingPluginId,
              req.user.id,
              { description, dateCreated: Date.now().toString(), roomId }
            );
            await removeUploadedFile();
            res.status(200).send({ success: true, message: 'Plugin Updated with new upload' });
          } catch (updateErr) {
            console.error('Error updating plugin:', updateErr);
            await removeUploadedFile();
            await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true }).catch(() => {});
            res.status(500).send({ success: false, message: 'Error updating plugin in database.' });
          }
        } else {
          // Add to the database
          try {
            await this.add(
              { name: pluginName, description, ownerId: req.user.id, ownerName: username, dateCreated: Date.now().toString(), roomId },
              req.user.id,
            );
            await removeUploadedFile();
            res.status(200).send({ success: true, message: 'Plugin Successfully Uploaded' });
          } catch (addErr) {
            console.error('Error adding plugin:', addErr);
            await removeUploadedFile();
            await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true }).catch(() => {});
            res.status(500).send({ success: false, message: 'Error adding plugin to database.' });
          }
        }
      } catch (e) {
        console.error('Error processing plugin upload:', e);
        await removeUploadedFile();
        await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true }).catch(() => {});
        res.status(500).send({ success: false, message: 'Error reading zip file.' });
      }
    });

    // REMOVE: Remove the plugin db reference and the files locally.
    router.delete('/remove/:id', async ({ params }, res) => {
      try {
        const docRef = this.collection.docRef(params.id);
        const doc = await docRef.read();
        if (doc === undefined) {
          res.status(404).send({ success: false, message: 'Plugin not found.' });
          return;
        }

        // Get plugin data and generate folder name
        const name = doc.data.name;
        const roomId = doc.data.roomId || '';
        const folderName = getPluginFolderName(roomId, name);
        
        try {
          await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true });
        } catch (fsErr) {
          console.error('Error removing plugin files:', fsErr);
          // Continue with database deletion even if file removal fails
        }

        // Delete the document
        const del = await this.delete(params.id);
        if (del) {
          res.status(200).send({ success: true });
        } else {
          res.status(500).send({ success: false, message: 'Failed to delete document.' });
        }
      } catch (err) {
        console.error('Error deleting plugin:', err);
        res.status(500).send({ success: false, message: 'Error deleting plugin.' });
      }
    });

    this.httpRouter = router;
  }

  /**
   * Initialize the collection and run migration if needed
   */
  public async initialize(clear?: boolean, ttl?: number): Promise<void> {
    await super.initialize(clear, ttl);
    
    // Run migration to update old plugin folders to new roomId_name format
    const migrationResults = await this.migratePluginFolders();
    if (migrationResults.success > 0 || migrationResults.failed > 0) {
      console.log(
        `Plugins> Migration complete - Success: ${migrationResults.success}, Failed: ${migrationResults.failed}, Skipped: ${migrationResults.skipped}`
      );
      if (migrationResults.errors.length > 0) {
        console.warn('Plugins> Migration errors:', migrationResults.errors);
      }
    }
  }

  // Delete all the plugins belonging to a specific room
  public async deletePluginsInRoom(roomId: string): Promise<number> {
    // Delete the plugins on the room
    const roomPlugins = await this.query('roomId', roomId);
    const pluginIds = roomPlugins ? roomPlugins.map((plugin) => plugin._id) : [];
    // Delete the plugins in a Promise.all
    const deletePromises = pluginIds.map((pluginId) => this.deletePlugin(pluginId));
    const results = await Promise.all(deletePromises);
    const numberDeleted = results.filter((r) => r).length;
    return numberDeleted;
  }

  // Delete a specific plugin
  // This will delete the plugin and all the associated files
  private async deletePlugin(pluginId: string): Promise<boolean> {
    try {
      const docRef = this.collection.docRef(pluginId);
      const doc = await docRef.read();
      if (doc === undefined) {
        return false;
      }
      // Get plugin data and generate folder name
      const name = doc.data.name;
      const roomId = doc.data.roomId || '';
      const folderName = getPluginFolderName(roomId, name);
      
      try {
        await fsPromises.rm(path.join(appsPath, folderName), { recursive: true, force: true });
      } catch (fsErr) {
        console.error('Error removing plugin files:', fsErr);
        // Continue with database deletion even if file removal fails
      }
      const deleteSuccess = await this.delete(pluginId);
      return deleteSuccess ? true : false;
    } catch (err) {
      console.error('Error in deletePlugin:', err);
      return false;
    }
  }

  // Delete all plugins belong to a specific user
  public async deletePluginsByUser(userId: string): Promise<number> {
    // Delete the plugins on the room
    const userPlugins = await this.query('ownerId', userId);
    const pluginIds = userPlugins ? userPlugins.map((plugin) => plugin._id) : [];
    // Delete the plugins in a Promise.all
    const deletePromises = pluginIds.map((pluginId) => this.deletePlugin(pluginId));
    const results = await Promise.all(deletePromises);
    const numberDeleted = results.filter((r) => r).length;
    return numberDeleted;
  }

  // Transfer all the plugins of a user to another user
  public async transferUsersPlugins(oldUserId: string, newOwnerId: string): Promise<boolean> {
    // Get all the plugins of the user
    const userPlugins = await this.query('ownerId', oldUserId);
    const pluginIds = userPlugins ? userPlugins.map((plugin) => plugin._id) : [];
    const res = await Promise.all(pluginIds.map((pluginId) => this.update(pluginId, newOwnerId, { ownerId: newOwnerId })));
    return res ? true : false;
  }

  /**
   * Migrate plugin folders from old format (name/) to new format (roomId_name/)
   * This should be run once to migrate existing plugins to the new folder structure
   * @returns Object with migration results
   */
  public async migratePluginFolders(): Promise<{ success: number; failed: number; skipped: number; errors: string[] }> {
    const results = { success: 0, failed: 0, skipped: 0, errors: [] as string[] };

    try {
      // Get all plugins from the database
      const allPlugins = await this.getAll();
      
      if (!allPlugins || allPlugins.length === 0) {
        return results;
      }

      for (const plugin of allPlugins) {
        const pluginName = plugin.data.name;
        const roomId = plugin.data.roomId || '';
        
        if (!roomId) {
          results.skipped++;
          continue;
        }

        const oldFolderPath = path.join(appsPath, pluginName);
        const newFolderName = getPluginFolderName(roomId, pluginName);
        const newFolderPath = path.join(appsPath, newFolderName);

        try {
          // Check if old folder exists
          const oldFolderExists = fs.existsSync(oldFolderPath);
          const newFolderExists = fs.existsSync(newFolderPath);

          if (newFolderExists) {
            // Already migrated or already in new format
            results.skipped++;
            continue;
          }

          if (!oldFolderExists) {
            // Folder doesn't exist in either format
            results.skipped++;
            continue;
          }

          // Migrate: rename old folder to new folder
          await fsPromises.rename(oldFolderPath, newFolderPath);
          results.success++;

        } catch (err) {
          const errorMsg = `Failed to migrate plugin "${pluginName}" (${plugin._id}): ${err instanceof Error ? err.message : String(err)}`;
          results.errors.push(errorMsg);
          results.failed++;
        }
      }

      return results;

    } catch (err) {
      const errorMsg = `Migration failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`Plugins> Migration error: ${errorMsg}`);
      results.errors.push(errorMsg);
      return results;
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

export const PluginsCollection = new SAGE3PluginsCollection();

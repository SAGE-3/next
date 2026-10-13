/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { APIClientWSMessage, PluginSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter, SubscriptionCache } from '@sage3/backend';
import { createRateLimiter, SBAuthSchema } from '@sage3/sagebase';
import express from 'express';
import { WebSocket } from 'ws';
import { z } from 'zod';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import multer from 'multer';
import * as path from 'path';
import { createHash } from 'crypto';
import { readPluginPackage } from './package';
import { performPluginOperation, pluginScope, PluginRequestError, requirePluginPermission } from './operations';
import { RoomsCollection } from '../rooms';
import { pluginActivationSchema, replacePluginPackage, setPluginActivation } from './approval';

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

const uploadBody = z.object({
  roomId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  username: z.string().min(1),
});

/**
 * Generate the folder name for a plugin using roomId_name format
 * This ensures plugins are scoped to rooms and allows same plugin names in different rooms
 */
function getPluginFolderName(roomId: string, pluginName: string): string {
  return `${roomId}_${pluginName}`;
}

class SAGE3PluginsCollection extends SAGE3Collection<PluginSchema> {
  constructor() {
    super('PLUGINS', {
      name: '',
      ownerId: '',
      roomId: '',
    });

    const router = express.Router();
    for (const directory of [pluginPath, uploadPath, appsPath]) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const handle =
      (action: (req: express.Request) => Promise<unknown>): express.RequestHandler =>
      async (req, res) => {
        try {
          const data = await action(req);
          res.status(200).send({ success: true, data });
        } catch (error) {
          const status = error instanceof PluginRequestError ? error.status : error instanceof z.ZodError ? 400 : 500;
          if (status === 500) {
            console.error('Plugin request failed:', error);
          }

          res.status(status).send({
            success: false,
            message: error instanceof Error ? error.message : 'Plugin request failed.',
          });
        }
      };

    router.post(
      '/upload',
      createRateLimiter(4),
      upload.single('plugin'),
      handle(async (req) => {
        if (!req.file) {
          throw new PluginRequestError('No ZIP file provided.');
        }

        // Multer names uploads with random hex.
        const uploaded = path.join(uploadPath, req.file.filename);
        let staging: string | undefined;

        try {
          requirePluginPermission(req.user, 'POST', 'PLUGINS');
          const body = uploadBody.parse(req.body);

          const room = await RoomsCollection.get(body.roomId);
          if (!room) {
            throw new PluginRequestError('Room not found.', 404);
          }

          const bytes = await fsPromises.readFile(uploaded);
          const packaged = await readPluginPackage(bytes).catch((error: unknown) => {
            throw new PluginRequestError(error instanceof Error ? error.message : 'Invalid plugin package.');
          });
          const { digest, manifest, files } = packaged;

          const catalogue = await this.query('roomId', body.roomId);
          if (!catalogue) {
            throw new PluginRequestError('Failed to read plugin catalogue.', 500);
          }

          const existing = catalogue.find((plugin) => (plugin.data.package?.manifest.id ?? plugin.data.name) === manifest.id);
          if (existing && existing.data.ownerId !== req.user.id) {
            throw new PluginRequestError('Only the plugin owner can replace this package.', 403);
          }

          staging = await fsPromises.mkdtemp(path.join(uploadPath, 'package-'));
          for (const { name, contents } of files) {
            // readPluginPackage admits only relative paths without empty, '.' or '..' segments.
            const target = path.join(staging, name);
            await fsPromises.mkdir(path.dirname(target), { recursive: true });
            await fsPromises.writeFile(target, contents);
          }

          // Room and manifest ids are identifier-validated; the digest is hex.
          const destination = path.join(appsPath, getPluginFolderName(body.roomId, manifest.id), digest);
          await fsPromises.mkdir(path.dirname(destination), { recursive: true });

          try {
            // Every published digest directory is nonempty, so rename cannot overwrite it.
            await fsPromises.rename(staging, destination);
            staging = undefined;
          } catch (error) {
            // A concurrent identical upload already published these immutable bytes.
            if (!(error instanceof Error) || !('code' in error) || !['EEXIST', 'ENOTEMPTY'].includes(String(error.code))) {
              throw error;
            }
          }

          const packageRecord = { digest, manifest };
          if (existing) {
            return replacePluginPackage(this.collection.docRef(existing._id), packageRecord, req.user.id, room.data.ownerId);
          }

          const id = createHash('sha256').update(body.roomId).update('\0').update(manifest.id).digest('hex');
          const document = await this.add(
            {
              name: manifest.id,
              description: manifest.description,
              package: packageRecord,
              dateCreated: Date.now().toString(),
              roomId: body.roomId,
              ownerId: req.user.id,
              ownerName: body.username,
            },
            req.user.id,
            id,
          );
          if (!document) {
            // Creation never overwrites; a retry takes the owner-checked replacement path.
            throw new PluginRequestError('Failed to save package catalogue. Retry the upload.', 409);
          }

          return document;
        } finally {
          await fsPromises.rm(uploaded, { force: true });
          if (staging) {
            await fsPromises.rm(staging, { recursive: true, force: true });
          }
        }
      }),
    );

    router.post(
      '/:pluginId/boards/:boardId/activation',
      handle(async (req) => {
        const activation = pluginActivationSchema.parse(req.body);
        const { plugin, boardId } = await pluginScope(this, req.params, req.user);
        requirePluginPermission(req.user, 'PUT', 'PLUGINS');

        return setPluginActivation(this.collection.docRef(plugin._id), boardId, activation, req.user.id);
      }),
    );

    router.post(
      '/:pluginId/boards/:boardId/operation',
      handle(async (req) => {
        const { plugin, boardId } = await pluginScope(this, req.params, req.user);

        return performPluginOperation(this.collection.docRef(plugin._id), plugin, boardId, req.user, req.body as unknown);
      }),
    );

    router.delete(
      '/remove/:id',
      createRateLimiter(4),
      handle(async (req) => {
        requirePluginPermission(req.user, 'DELETE', 'PLUGINS');

        // A named route parameter is always a non-empty string.
        const plugin = await this.get(req.params.id as string);
        if (!plugin) {
          throw new PluginRequestError('Plugin not found.', 404);
        }
        if (plugin.data.ownerId !== req.user.id) {
          throw new PluginRequestError('Only the plugin owner can remove it.', 403);
        }

        if (!(await this.deletePlugin(plugin._id))) {
          throw new PluginRequestError('Failed to remove plugin.', 500);
        }

        return plugin._id;
      }),
    );

    // Keep catalogue reads/subscriptions, but never expose generic plugin writes.
    router.use((req, res, next) => {
      if (req.method === 'GET' || req.method === 'HEAD') {
        next();
      } else {
        res.status(403).send({ success: false, message: 'Use the dedicated extension endpoints.' });
      }
    });

    router.use(sageRouter<PluginSchema>(this));
    this.httpRouter = router;
  }

  public override async wsRouter(
    socket: WebSocket,
    message: APIClientWSMessage,
    user: SBAuthSchema,
    cache: SubscriptionCache,
  ): Promise<void> {
    if (message.method !== 'GET' && message.method !== 'SUB' && message.method !== 'UNSUB') {
      socket.send(
        JSON.stringify({
          id: message.id,
          success: false,
          message: 'Use the dedicated extension endpoints.',
        }),
      );
      return;
    }

    return super.wsRouter(socket, message, user, cache);
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

  // Removing the catalogue disables rendering; immutable assets are retained so
  // a concurrent install can never lose its files to another request's cleanup.
  private async deletePlugin(pluginId: string): Promise<boolean> {
    return Boolean(await this.delete(pluginId));
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
}

export const PluginsCollection = new SAGE3PluginsCollection();

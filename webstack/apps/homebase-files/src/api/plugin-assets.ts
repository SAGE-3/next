import express from 'express';
import { SAGEBase, SBAuthSchema } from '@sage3/sagebase';
import type { BoardSchema, PluginSchema } from '@sage3/shared/types';
import { safeAssetMimeType } from '@sage3/backend';
import { AssetsCollection } from './assetsCollection';
import { uploadPluginAsset } from './uploadHandler';
import { PluginAssetRequestError, pluginAssetFile, requirePluginAssetAccess } from './plugin-asset-access';
import { config } from '../config';

export function PluginAssetsRouter(): express.Router {
  const router = express.Router();
  const prefix = '/:pluginId/boards/:boardId';

  async function authorize(req: express.Request, action: 'GET' | 'POST'): Promise<string> {
    // Named route parameters are non-empty strings, used here only as document keys.
    const { pluginId, boardId } = req.params as { pluginId: string; boardId: string };
    const plugins = await SAGEBase.Database.collection<PluginSchema>('PLUGINS');
    const boards = await SAGEBase.Database.collection<BoardSchema>('BOARDS');
    const [plugin, board] = await Promise.all([plugins.docRef(pluginId).read(), boards.docRef(boardId).read()]);

    return requirePluginAssetAccess(plugin, board, req.user as SBAuthSchema, req.header('x-sage3-plugin-digest'), action);
  }

  function fail(res: express.Response, error: unknown): void {
    const status = error instanceof PluginAssetRequestError ? error.status : 500;
    const message = error instanceof PluginAssetRequestError ? error.message : 'Asset request failed.';
    if (!res.headersSent) {
      res.status(status).json({ error: message });
    }
  }

  router.post(`${prefix}/upload`, async (req, res) => {
    try {
      await uploadPluginAsset(req, res, await authorize(req, 'POST'));
    } catch (error) {
      fail(res, error);
    }
  });

  router.get(`${prefix}/:assetId`, async (req, res) => {
    try {
      const roomId = await authorize(req, 'GET');
      const rawPage = req.query.page;
      if (rawPage !== undefined && (typeof rawPage !== 'string' || !/^(0|[1-9][0-9]*)$/.test(rawPage))) {
        throw new PluginAssetRequestError('Invalid PDF page.');
      }

      const page = rawPage === undefined ? undefined : Number(rawPage);
      const asset = await AssetsCollection.get(req.params.assetId as string);
      if (!asset) {
        throw new PluginAssetRequestError('Asset not found.', 404);
      }

      const file = await pluginAssetFile(asset, roomId, config.public, page);

      res.setHeader('Content-Type', safeAssetMimeType(file.mimeType));
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(file.path, (error) => {
        if (error) {
          fail(res, new PluginAssetRequestError('Asset could not be read.', 404));
        }
      });
    } catch (error) {
      fail(res, error);
    }
  });

  return router;
}

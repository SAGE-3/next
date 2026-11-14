import * as path from 'path';
import { promises as fs } from 'fs';
import type { Asset, Board, Plugin } from '@sage3/shared/types';
import type { SBAuthSchema } from '@sage3/sagebase';
import { checkPermissionsWS } from '@sage3/backend/permissions';

export class PluginAssetRequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function requirePluginAssetAccess(
  plugin: Plugin | undefined,
  board: Board | undefined,
  user: SBAuthSchema,
  digest: string | undefined,
  action: 'GET' | 'POST',
): string {
  // Every role that can read one collection can read all of them.
  if (!checkPermissionsWS(user, 'GET', 'PLUGINS') || (action === 'POST' && !checkPermissionsWS(user, 'POST', 'ASSETS'))) {
    throw new PluginAssetRequestError('Permission denied.', 403);
  }
  if (!plugin || !board || !plugin.data.roomId || plugin.data.roomId !== board.data.roomId) {
    throw new PluginAssetRequestError('Extension or board not found in this room.', 404);
  }

  const packaged = plugin.data.package;
  const capability = action === 'GET' ? 'assets.read' : 'assets.write';
  if (
    !packaged ||
    packaged.digest !== digest ||
    plugin.data.boardGrants?.[board._id] !== packaged.digest ||
    !packaged.manifest.capabilities.includes(capability)
  ) {
    throw new PluginAssetRequestError('Extension is unavailable or lacks asset access.', 403);
  }

  return plugin.data.roomId;
}

/** Resolve only native, recorded files within the asset root, including through symlinks. */
export async function pluginAssetFile(
  asset: Asset,
  roomId: string,
  root: string,
  page?: number,
): Promise<{ path: string; mimeType: string }> {
  if (asset.data.room !== roomId) {
    throw new PluginAssetRequestError('Asset not found.', 404);
  }

  const data = asset.data;
  let filename = data.file;
  let mimeType = data.mimetype;
  if (page !== undefined) {
    if (data.mimetype !== 'application/pdf' || !Array.isArray(data.derived)) {
      throw new PluginAssetRequestError('Invalid PDF page.');
    }
    const images = data.derived[page];
    if (!images?.length) {
      throw new PluginAssetRequestError('PDF page not found.', 404);
    }

    const image = images.reduce((largest, candidate) => (candidate.width > largest.width ? candidate : largest));
    const expected = `${path.parse(data.file).name}-${page}-${image.width}.webp`;
    if (image.url !== `api/assets/static/${expected}` && image.url !== `/api/assets/static/${expected}`) {
      throw new PluginAssetRequestError('PDF page not found.', 404);
    }
    filename = expected;
    mimeType = 'image/webp';
  }

  // Asset records are writable through generic routes, so the file must resolve directly inside root.
  try {
    const directory = await fs.realpath(root);
    const resolved = await fs.realpath(path.join(directory, filename));
    if (path.dirname(resolved) !== directory) {
      throw new PluginAssetRequestError('Asset not found.', 404);
    }

    const stat = await fs.stat(resolved);
    if (!stat.isFile()) {
      throw new PluginAssetRequestError('Asset not found.', 404);
    }

    return { path: resolved, mimeType };
  } catch (error) {
    if (error instanceof PluginAssetRequestError) {
      throw error;
    }

    throw new PluginAssetRequestError('Asset not found.', 404);
  }
}

import type { Asset } from '@sage3/shared/types';
import type { PluginAsset } from '@sage3/sageplugin';

/** Public asset metadata deliberately excludes stored paths, URLs, owners and processing metadata. */
export function toPluginAsset(asset: Asset): PluginAsset {
  const data = asset.data;
  return {
    id: asset._id,
    name: data.originalfilename,
    mimeType: safeAssetMimeType(data.mimetype),
    size: data.size,
    ...(data.mimetype === 'application/pdf' && Array.isArray(data.derived) ? { pageCount: data.derived.length } : {}),
  };
}

export function safeAssetMimeType(value: string): string {
  return /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(value) ? value : 'application/octet-stream';
}

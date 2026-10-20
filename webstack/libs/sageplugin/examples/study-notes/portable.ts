import { formatDocumentReference, parseDocumentReference } from '@sage3/sageplugin';
import type { PluginAsset, PluginState } from '@sage3/sageplugin';
import { object } from './model';

export type PortableApp = {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  installationId?: string;
  manifestId?: string;
  viewId?: string;
  content?: PluginState;
  texts?: Record<string, string>;
  state?: PluginState;
};

export type PortableAsset = PluginAsset & { path: string; previews: { page: number; path: string; mimeType: string }[] };
export type PortableLink = { id: string; source: string; target: string; metadata?: PluginState };

export type PortableBoard = {
  format: 'sage3-study-notes';
  version: 2;
  boardId: string;
  installationId: string;
  manifestId: 'study-notes';
  state: PluginState;
  apps: PortableApp[];
  assets: PortableAsset[];
  links: PortableLink[];
};

export function parseBoard(value: unknown): PortableBoard {
  const board = object(value);

  if (
    board.format !== 'sage3-study-notes' ||
    board.version !== 2 ||
    board.manifestId !== 'study-notes' ||
    typeof board.boardId !== 'string' ||
    typeof board.installationId !== 'string' ||
    !Array.isArray(board.apps) ||
    !Array.isArray(board.assets) ||
    !Array.isArray(board.links)
  ) {
    throw new Error('Expected a version 2 Study notes portable board ZIP.');
  }

  const ids: string[] = [];

  for (const entry of board.apps) {
    const app = object(entry);
    const position = object(app.position);
    const size = object(app.size);

    if (
      typeof app.id !== 'string' ||
      ids.includes(app.id) ||
      typeof app.type !== 'string' ||
      typeof app.title !== 'string' ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      typeof size.width !== 'number' ||
      typeof size.height !== 'number' ||
      !Number.isFinite(size.width) ||
      !Number.isFinite(size.height) ||
      size.width <= 0 ||
      size.height <= 0
    ) {
      throw new Error('Invalid or duplicate portable app.');
    }

    ids.push(app.id);

    if (app.texts !== undefined && Object.values(object(app.texts)).some((text) => typeof text !== 'string')) {
      throw new Error('Invalid portable text.');
    }
  }

  const assets: string[] = [];

  for (const entry of board.assets) {
    const asset = object(entry);

    if (
      typeof asset.id !== 'string' ||
      assets.includes(asset.id) ||
      typeof asset.name !== 'string' ||
      typeof asset.mimeType !== 'string' ||
      typeof asset.path !== 'string' ||
      !/^assets\/[\w-]+$/.test(asset.path) ||
      !Array.isArray(asset.previews)
    ) {
      throw new Error('Invalid or duplicate portable asset.');
    }

    assets.push(asset.id);

    for (const entry of asset.previews) {
      const preview = object(entry);

      if (
        !Number.isInteger(preview.page) ||
        Number(preview.page) < 0 ||
        typeof preview.mimeType !== 'string' ||
        typeof preview.path !== 'string' ||
        !/^previews\/[\w-]+\/\d+$/.test(preview.path)
      ) {
        throw new Error('Invalid portable page preview.');
      }
    }
  }

  const links: string[] = [];

  for (const entry of board.links) {
    const link = object(entry);
    if (typeof link.id !== 'string' || links.includes(link.id) || typeof link.source !== 'string' || typeof link.target !== 'string') {
      throw new Error('Invalid or duplicate portable link.');
    }

    links.push(link.id);
  }

  return board as PortableBoard;
}

// Exact identifiers and SDK document references, never display names or filenames.
export function remapReferences(value: unknown, ids: ReadonlyMap<string, string>): unknown {
  if (typeof value === 'string') {
    if (ids.has(value)) {
      return ids.get(value)!;
    }

    const images = value.replace(/(^|\n)(\s*img:\s*)([\w-]+)/g, (_match, line, prefix, id) => `${line}${prefix}${ids.get(id) ?? id}`);

    return images.replace(/sage3:\/\/[^\s)\]<>"']+/g, (url) => {
      const reference = parseDocumentReference(url);

      if (!reference) {
        return url;
      }

      return formatDocumentReference({
        ...reference,
        appId: ids.get(reference.appId) ?? reference.appId,
        assetId: reference.assetId ? (ids.get(reference.assetId) ?? reference.assetId) : undefined,
      });
    });
  }

  if (Array.isArray(value)) {
    return value.map((entry) => remapReferences(entry, ids));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [ids.get(key) ?? key, remapReferences(entry, ids)]));
  }

  return value;
}

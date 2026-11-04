import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Asset, Board, Plugin } from '@sage3/shared/types';
import type { SBAuthSchema } from '@sage3/sagebase';
import { toPluginAsset } from '../../../../../../libs/backend/src/lib/utils/plugin-assets';
import { pluginAssetFile, requirePluginAssetAccess } from '../../../../../homebase-files/src/api/plugin-asset-access';

const metadata = { _id: 'asset', _createdAt: 0, _updatedAt: 0, _createdBy: 'owner', _updatedBy: 'owner' };
const digest = 'a'.repeat(64);
const user: SBAuthSchema = { id: 'owner', provider: 'google', providerId: 'owner' };
const plugin: Plugin = {
  ...metadata,
  _id: 'plugin',
  data: {
    name: 'Test',
    description: '',
    ownerId: 'owner',
    ownerName: 'Owner',
    dateCreated: '0',
    roomId: 'room',
    package: {
      digest,
      manifest: {
        id: 'test',
        apiVersion: 1,
        name: 'Test',
        description: '',
        entry: 'index.html',
        capabilities: ['assets.read', 'assets.write'],
      },
    },
    boardGrants: { board: digest },
  },
};
const board: Board = {
  ...metadata,
  _id: 'board',
  data: {
    name: 'Board',
    description: '',
    color: '',
    roomId: 'room',
    ownerId: 'owner',
    isPrivate: false,
    privatePin: '',
    code: '',
    whiteboardLines: [],
    executeInfo: { executeFunc: '', params: {} },
  },
};
const asset: Asset = {
  ...metadata,
  data: {
    file: 'document.pdf',
    owner: 'owner',
    room: 'room',
    originalfilename: 'Original.pdf',
    path: '/private/document.pdf',
    dateCreated: '0',
    dateAdded: '0',
    mimetype: 'application/pdf',
    destination: '/private',
    size: 3,
    derived: [
      [
        {
          url: 'api/assets/static/document-0-800.webp',
          format: 'webp',
          size: 4,
          width: 800,
          height: 600,
          channels: 4,
          premultiplied: false,
        },
      ],
    ],
  },
};

it('exposes only public metadata and scopes access to the grant, room, capability and write permission', () => {
  expect(toPluginAsset(asset)).toEqual({ id: 'asset', name: 'Original.pdf', mimeType: 'application/pdf', size: 3, pageCount: 1 });
  expect(requirePluginAssetAccess(plugin, board, user, digest, 'POST')).toBe('room');
  expect(() => requirePluginAssetAccess(plugin, board, user, 'stale', 'GET')).toThrow();
  expect(() => requirePluginAssetAccess(plugin, { ...board, data: { ...board.data, roomId: 'foreign' } }, user, digest, 'GET')).toThrow();
  expect(() => requirePluginAssetAccess(plugin, board, { ...user, provider: 'spectator' }, digest, 'POST')).toThrow();
  const noCapabilities = {
    ...plugin,
    data: {
      ...plugin.data,
      package: {
        ...plugin.data.package!,
        manifest: { ...plugin.data.package!.manifest, capabilities: [] },
      },
    },
  };
  expect(() => requirePluginAssetAccess(noCapabilities, board, user, digest, 'GET')).toThrow();
});

it('reads originals and zero-based PDF images while refusing missing, foreign and unsafe files', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sage-plugin-assets-'));
  const root = path.join(directory, 'assets');
  await fs.mkdir(root);

  try {
    await fs.writeFile(path.join(root, 'document.pdf'), 'pdf');
    await fs.writeFile(path.join(root, 'document-0-800.webp'), 'webp');
    const original = await pluginAssetFile(asset, 'room', root);
    const page = await pluginAssetFile(asset, 'room', root, 0);
    expect(await fs.readFile(original.path, 'utf8')).toBe('pdf');
    expect(original.mimeType).toBe('application/pdf');
    expect(await fs.readFile(page.path, 'utf8')).toBe('webp');
    expect(page.mimeType).toBe('image/webp');

    await expect(pluginAssetFile(asset, 'foreign', root)).rejects.toMatchObject({ status: 404 });
    await expect(pluginAssetFile(asset, 'room', root, 1)).rejects.toMatchObject({ status: 404 });
    await expect(pluginAssetFile({ ...asset, data: { ...asset.data, file: '../../outside' } }, 'room', root)).rejects.toMatchObject({
      status: 404,
    });

    await fs.writeFile(path.join(directory, 'outside.pdf'), 'secret');
    await fs.unlink(path.join(root, 'document.pdf'));
    await fs.symlink(path.join(directory, 'outside.pdf'), path.join(root, 'document.pdf'));
    await expect(pluginAssetFile(asset, 'room', root)).rejects.toMatchObject({ status: 404 });

    await fs.unlink(path.join(root, 'document.pdf'));
    await expect(pluginAssetFile(asset, 'room', root)).rejects.toMatchObject({ status: 404 });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

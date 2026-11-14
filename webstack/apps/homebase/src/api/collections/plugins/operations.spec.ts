import * as Y from 'yjs';
import type { App } from '@sage3/applications/schema';
import type { Asset, Plugin, PluginSchema } from '@sage3/shared/types';
import type { PluginTextSnapshot } from '@sage3/sageplugin';
import { SAGEBase, type SBAuthSchema } from '@sage3/sagebase';
import { AppsCollection } from '../apps';
import { AssetsCollection } from '../assets';
import { performPluginOperation } from './operations';

jest.mock('../apps', () => ({
  AppsCollection: {
    get: jest.fn(),
    add: jest.fn(),
    query: jest.fn(),
  },
}));
jest.mock('../assets', () => ({ AssetsCollection: { get: jest.fn(), query: jest.fn() } }));
jest.mock('../boards', () => ({ BoardsCollection: { get: jest.fn() } }));
jest.mock('../rooms', () => ({ RoomsCollection: { get: jest.fn() } }));
jest.mock('../link', () => ({ LinkCollection: { add: jest.fn(), get: jest.fn(), query: jest.fn() } }));
jest.mock('@sage3/sagebase', () => ({
  ...jest.requireActual('@sage3/sagebase'),
  SAGEBase: { Database: { collection: jest.fn() } },
}));

const metadata = {
  _id: 'extension',
  _createdAt: 0,
  _updatedAt: 0,
  _createdBy: 'owner',
  _updatedBy: 'owner',
};

const user: SBAuthSchema = { id: 'owner', provider: 'google', providerId: 'owner' };
const packageDigest = 'a'.repeat(64);
const assetId = '12345678-1234-4123-8123-123456789abc';

const plugin: Plugin = {
  ...metadata,
  data: {
    name: 'reading',
    ownerId: 'owner',
    ownerName: 'Owner',
    description: '',
    dateCreated: '0',
    roomId: 'room',
    package: {
      digest: packageDigest,
      manifest: {
        id: 'reading',
        apiVersion: 1,
        name: 'Reading',
        description: '',
        entry: 'index.html',
        capabilities: ['apps.write', 'documents.navigate'],
        views: [{ id: 'note', kind: 'app', title: 'Note', entry: 'note.html' }],
      },
    },
    boardGrants: { board: packageDigest },
    boardState: { other: { keep: true } },
  },
};

const app: App<'PluginApp'> = {
  ...metadata,
  _id: 'app',
  data: {
    title: 'Note',
    boardId: 'board',
    roomId: 'room',
    type: 'PluginApp',
    position: { x: 0, y: 0, z: 0 },
    size: { width: 300, height: 200, depth: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    state: { pluginId: 'extension', viewId: 'note', content: { existing: true } },
    raised: false,
    dragging: false,
    pinned: false,
  },
};

const asset: Asset = {
  ...metadata,
  _id: assetId,
  data: {
    file: 'document.pdf',
    owner: 'owner',
    room: 'room',
    originalfilename: 'document.pdf',
    path: '',
    dateCreated: '0',
    dateAdded: '0',
    mimetype: 'application/pdf',
    destination: '',
    size: 1,
  },
};

const executableApps: readonly App[] = [
  {
    ...app,
    data: {
      ...app.data,
      type: 'IFrame',
      state: { source: '', doc: '' },
    },
  },
  {
    ...app,
    data: {
      ...app.data,
      type: 'SageCell',
      state: {
        code: '',
        msgId: '',
        history: [],
        streaming: false,
        language: 'python',
        fontSize: 16,
        kernel: '',
        session: '',
        rank: 0,
        executeInfo: { executeFunc: '', params: {} },
      },
    },
  },
];

beforeEach(() => jest.resetAllMocks());

it('requires the current grant, loaded digest, capability and user permission', async () => {
  const collection = { patchNested: jest.fn() };
  const disabled: readonly PluginSchema[] = [
    { ...plugin.data, boardGrants: {} },
    { ...plugin.data, boardGrants: { board: 'b'.repeat(64) } },
    { ...plugin.data, package: undefined },
  ];

  for (const data of disabled) {
    await expect(
      performPluginOperation(collection, { ...plugin, data }, 'board', user, { packageDigest, method: 'state.get' }),
    ).rejects.toThrow('disabled');
  }

  await expect(performPluginOperation(collection, plugin, 'board', user, { packageDigest, method: 'apps.list' })).rejects.toThrow(
    'Capability not approved',
  );

  await expect(
    performPluginOperation(
      collection,
      plugin,
      'board',
      { ...user, provider: 'spectator' },
      {
        packageDigest,
        method: 'apps.remove',
        params: { id: 'app' },
      },
    ),
  ).rejects.toThrow('Permission denied');

  await expect(
    performPluginOperation(collection, plugin, 'board', user, {
      packageDigest: 'b'.repeat(64),
      method: 'state.patch',
      params: { changes: [{ op: 'set', path: ['note'], value: 'old code' }] },
    }),
  ).rejects.toThrow('package has changed');
  expect(collection.patchNested).not.toHaveBeenCalled();
});

it('rejects cross-board, cross-room and cross-extension targets', async () => {
  const collection = { patchNested: jest.fn() };
  const get = jest.mocked(AppsCollection.get);

  for (const scope of [{ boardId: 'other' }, { roomId: 'other' }]) {
    get.mockResolvedValue({ ...app, data: { ...app.data, ...scope } });
    await expect(
      performPluginOperation(collection, plugin, 'board', user, {
        packageDigest,
        method: 'apps.remove',
        params: { id: 'app' },
      }),
    ).rejects.toThrow('not found on this board');
  }

  get.mockResolvedValue({
    ...app,
    data: {
      ...app.data,
      state: { ...app.data.state, pluginId: 'different' },
    },
  });
  await expect(
    performPluginOperation(collection, plugin, 'board', user, {
      packageDigest,
      method: 'app.content.get',
      params: { appId: 'app' },
    }),
  ).rejects.toThrow('another extension');
});

it('reads foreign plugin plaintext only with apps.read while writes remain owned', async () => {
  const collection = { patchNested: jest.fn() };
  const reader = structuredClone(plugin);
  reader.data.package!.manifest.capabilities.push('apps.read');
  const source = new Y.Doc();
  source.getText('body').insert(0, 'Foreign plaintext');
  const update = Buffer.from(Y.encodeStateAsUpdate(source)).toString('base64');
  source.destroy();
  const foreign: App<'PluginApp'> = {
    ...app,
    data: {
      ...app.data,
      state: { ...app.data.state, pluginId: 'different', texts: { body: update } },
    },
  };
  const get = jest.mocked(AppsCollection.get);
  const read = { packageDigest, method: 'text.get', params: { appId: 'app', field: 'body' } };
  get.mockResolvedValue(foreign);
  const snapshot = (await performPluginOperation(collection, reader, 'board', user, read)) as PluginTextSnapshot;
  const decoded = new Y.Doc();
  Y.applyUpdate(decoded, Buffer.from(snapshot.update, 'base64'));
  expect(snapshot).toMatchObject({ appId: 'app', field: 'body' });
  expect(decoded.getText('body').toString()).toBe('Foreign plaintext');
  decoded.destroy();

  await expect(performPluginOperation(collection, plugin, 'board', user, read)).rejects.toThrow('Capability not approved: apps.read');
  await expect(
    performPluginOperation(collection, reader, 'board', user, {
      packageDigest,
      method: 'text.apply',
      params: { ...read.params, update },
    }),
  ).rejects.toThrow('another extension');

  for (const scope of [{ boardId: 'other' }, { roomId: 'other' }]) {
    get.mockResolvedValue({ ...foreign, data: { ...foreign.data, ...scope } });
    await expect(performPluginOperation(collection, reader, 'board', user, read)).rejects.toThrow('not found on this board');
  }
  get.mockResolvedValue(executableApps[0]);
  await expect(performPluginOperation(collection, reader, 'board', user, read)).rejects.toThrow('Not an extension app');

  get.mockResolvedValue({ ...app, data: { ...app.data, state: { ...app.data.state, texts: { body: update } } } });
  await expect(performPluginOperation(collection, plugin, 'board', user, read)).resolves.toMatchObject({
    appId: 'app',
    field: 'body',
  });
  expect(SAGEBase.Database.collection).not.toHaveBeenCalled();
});

it('denies executable native creation and state mutation, not just malicious payloads', async () => {
  const collection = { patchNested: jest.fn() };

  for (const native of executableApps) {
    jest.mocked(AppsCollection.get).mockResolvedValue(native);
    await expect(
      performPluginOperation(collection, plugin, 'board', user, {
        packageDigest,
        method: 'apps.create',
        params: { type: native.data.type },
      }),
    ).rejects.toThrow('Unsupported app type');

    await expect(
      performPluginOperation(collection, plugin, 'board', user, {
        packageDigest,
        method: 'apps.update',
        params: { id: 'app', updates: { state: native.data.state } },
      }),
    ).rejects.toThrow('Unsupported app state');
  }

  expect(AppsCollection.add).not.toHaveBeenCalled();
});

it('rejects image and PDF assets from another room', async () => {
  const collection = { patchNested: jest.fn() };
  jest.mocked(AssetsCollection.get).mockResolvedValue({ ...asset, data: { ...asset.data, room: 'other' } });

  await expect(
    performPluginOperation(collection, plugin, 'board', user, {
      packageDigest,
      method: 'apps.create',
      params: { type: 'PDFViewer', state: { assetid: assetId } },
    }),
  ).rejects.toThrow('Asset not found in this room');
  expect(AppsCollection.add).not.toHaveBeenCalled();
});

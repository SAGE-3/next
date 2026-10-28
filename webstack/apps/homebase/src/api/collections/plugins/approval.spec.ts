import { randomUUID } from 'crypto';
import { createClient } from 'redis';
import { SBDocumentRef } from '@sage3/sagebase';
import type { PluginSchema } from '@sage3/shared/types';
import { replacePluginPackage, setPluginActivation } from './approval';

jest.mock('../apps', () => ({ AppsCollection: {} }));
jest.mock('../assets', () => ({ AssetsCollection: {} }));
jest.mock('../boards', () => ({ BoardsCollection: {} }));
jest.mock('../link', () => ({ LinkCollection: {} }));
jest.mock('../rooms', () => ({
  RoomsCollection: { get: jest.fn(async () => ({ data: { ownerId: mockRoomOwnerId } })) },
}));

const mockRoomOwnerId = 'room-owner';
const original: NonNullable<PluginSchema['package']> = {
  digest: 'a'.repeat(64),
  manifest: {
    id: 'reading',
    apiVersion: 1,
    name: 'Reading',
    description: '',
    entry: 'index.html',
    capabilities: ['apps.read'],
  },
};
const replacement = { ...original, digest: 'b'.repeat(64) };

// Run against disposable Redis Stack to exercise real conditional writes from separate clients.
const integration = process.env.SAGE3_TEST_REDIS_URL ? describe : describe.skip;
integration('owner approval and package publication', () => {
  const clients = [createClient({ url: process.env.SAGE3_TEST_REDIS_URL }), createClient({ url: process.env.SAGE3_TEST_REDIS_URL })];
  const key = `sage3-test:${randomUUID()}:plugin-approval`;
  const documents = clients.map((client) => new SBDocumentRef<PluginSchema>('extension', 'PLUGINS', key, client));

  beforeAll(async () => {
    await Promise.all(clients.map((client) => client.connect()));
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    const result = await documents[0].set(
      {
        name: 'reading',
        ownerId: 'uploader',
        ownerName: 'Uploader',
        roomId: 'room',
        dateCreated: '0',
        description: '',
        package: original,
        boardState: { board: { keep: true } },
        boardRevisions: { board: 4 },
      },
      'uploader',
      -1,
      false,
    );
    expect(result.success).toBe(true);
  });

  afterAll(async () => {
    if (clients[0].isOpen) {
      await clients[0].del(key);
    }
    await Promise.all(clients.filter((client) => client.isOpen).map((client) => client.quit()));
  });

  it('retains identical consent but enables changed code only on opted-in boards within the capability ceiling', async () => {
    await setPluginActivation(documents[0], 'board', { enabled: true, packageDigest: original.digest, autoApprove: true }, 'room-owner');
    await setPluginActivation(documents[0], 'manual', { enabled: true, packageDigest: original.digest, autoApprove: false }, 'room-owner');

    const identical = await replacePluginPackage(documents[0], original, 'uploader', mockRoomOwnerId);
    expect(identical.data.boardGrants).toEqual({ board: original.digest, manual: original.digest });

    const updated = await replacePluginPackage(documents[1], replacement, 'uploader', mockRoomOwnerId);
    expect(updated.data.boardGrants).toEqual({ board: replacement.digest });
    expect(updated.data.boardAutoApprovals).toEqual({ board: { ownerId: 'room-owner', capabilities: ['apps.read'] } });
    expect(updated.data.boardState).toEqual({ board: { keep: true } });
    expect(updated.data.boardRevisions).toEqual({ board: 4 });

    const expanded: NonNullable<PluginSchema['package']> = {
      digest: 'c'.repeat(64),
      manifest: { ...original.manifest, capabilities: ['apps.read', 'assets.read'] },
    };
    const blocked = await replacePluginPackage(documents[0], expanded, 'uploader', mockRoomOwnerId);
    expect(blocked.data.boardGrants).toEqual({});
    expect(blocked.data.boardAutoApprovals?.board.capabilities).toEqual(['apps.read']);

    const approved = await setPluginActivation(
      documents[0],
      'board',
      { enabled: true, packageDigest: expanded.digest, autoApprove: true },
      'room-owner',
    );
    expect(approved.data.boardGrants?.board).toBe(expanded.digest);
    expect(approved.data.boardAutoApprovals?.board.capabilities).toEqual(['apps.read', 'assets.read']);

    const currentOnly = await setPluginActivation(
      documents[0],
      'board',
      { enabled: true, packageDigest: expanded.digest, autoApprove: false },
      'room-owner',
    );
    expect(currentOnly.data.boardGrants?.board).toBe(expanded.digest);
    expect(currentOnly.data.boardAutoApprovals?.board).toBeUndefined();
    expect((await replacePluginPackage(documents[1], replacement, 'uploader', mockRoomOwnerId)).data.boardGrants).toEqual({});
  });

  it('keeps a disable and unrelated state changes made after an upload’s read', async () => {
    await setPluginActivation(documents[0], 'board', { enabled: true, packageDigest: original.digest, autoApprove: true }, 'room-owner');
    const commit = documents[0].updateNestedMany.bind(documents[0]);
    jest.spyOn(documents[0], 'updateNestedMany').mockImplementationOnce(async (changes, by, conditions) => {
      await setPluginActivation(documents[1], 'board', { enabled: false }, 'room-owner');

      await documents[1].updateNested(['boardState', 'board', 'concurrent'], 'saved', 'writer');
      return commit(changes, by, conditions);
    });

    await expect(replacePluginPackage(documents[0], replacement, 'uploader', mockRoomOwnerId)).rejects.toMatchObject({ status: 409 });
    const current = await documents[0].read();
    expect(current?.data.package).toEqual(original);
    expect(current?.data.boardGrants).toEqual({});
    expect(current?.data.boardAutoApprovals).toEqual({});
    expect(current?.data.boardState?.board).toEqual({ keep: true, concurrent: 'saved' });
    const later = await replacePluginPackage(documents[1], original, 'uploader', mockRoomOwnerId);
    expect(later.data.boardGrants).toEqual({});
  });

  it('rejects stale consent if package publication wins the atomic write', async () => {
    const commit = documents[0].updateNestedMany.bind(documents[0]);
    jest.spyOn(documents[0], 'updateNestedMany').mockImplementationOnce(async (changes, by, conditions) => {
      await replacePluginPackage(documents[1], replacement, 'uploader', mockRoomOwnerId);
      return commit(changes, by, conditions);
    });

    await expect(
      setPluginActivation(documents[0], 'board', { enabled: true, packageDigest: original.digest, autoApprove: true }, 'room-owner'),
    ).rejects.toMatchObject({ status: 409 });
    const current = await documents[1].read();
    expect(current?.data.boardGrants).toEqual({});
    expect(current?.data.boardAutoApprovals).toEqual({});
  });
});

import { randomUUID } from 'crypto';
import { createClient } from 'redis';
import { SBDocumentRef, SBJSON } from './SBDocument';

// Opt in with SAGE3_TEST_REDIS_URL pointing to disposable Redis Stack (RedisJSON).
const integration = process.env.SAGE3_TEST_REDIS_URL ? describe : describe.skip;

integration('atomic extension namespaces across homebase writers', () => {
  const url = process.env.SAGE3_TEST_REDIS_URL;
  const clients = [createClient({ url }), createClient({ url })] as const;
  const key = `sage3-test:${randomUUID()}:extension`;

  type NamespaceData = {
    boardState?: Record<string, SBJSON>;
    boardRevisions?: Record<string, number>;
    state?: { content: SBJSON; contentRevision?: number; texts?: Record<string, string> };
    boardGrants?: Record<string, string>;
    package?: {
      digest: string;
      manifest: {
        id: string;
      };
    };
    ownerId?: string;
  };

  const documents = clients.map((client) => new SBDocumentRef<NamespaceData>('extension', 'PLUGINS', key, client));

  beforeAll(async () => {
    await Promise.all(clients.map((client) => client.connect()));
  });

  afterAll(async () => {
    if (clients[0].isOpen) {
      await clients[0].del(key);
    }

    await Promise.all(clients.filter((client) => client.isOpen).map((client) => client.quit()));
  });

  it('does not let concurrent creates replace the winning owner', async () => {
    await clients[0].del(key);

    const results = await Promise.all([
      documents[0].set({ ownerId: 'ownerA' }, 'ownerA', -1, false, true),
      documents[1].set({ ownerId: 'ownerB' }, 'ownerB', -1, false, true),
    ]);

    expect(results.filter((result) => result.success)).toHaveLength(1);

    const winner = results.find((result) => result.success)?.doc;
    expect(await documents[0].read()).toEqual(winner);

    expect((await documents[1].set({ ownerId: 'intruder' }, 'intruder', 1, true, true)).success).toBe(false);
    expect(await documents[1].read()).toEqual(winner);
    expect(await clients[0].ttl(key)).toBe(-1);
  });

  it('rejects stale revisions and array traversal without any partial mutation', async () => {
    await documents[0].set({ boardState: { boardA: { items: [] } }, boardRevisions: { boardA: 3 } }, 'owner', -1, false);
    const before = await documents[0].read();
    const stale = await documents[1].patchNested(
      ['boardState', 'boardA'],
      ['boardRevisions', 'boardA'],
      [{ op: 'set', path: ['wouldOverwrite'], value: true }],
      'userB',
      2,
    );

    expect(stale).toMatchObject({ success: false, conflict: true });
    expect(await documents[0].read()).toEqual(before);

    const invalid = await documents[1].patchNested(
      ['boardState', 'boardA'],
      ['boardRevisions', 'boardA'],
      [
        { op: 'set', path: ['first'], value: 'must not survive' },
        { op: 'set', path: ['items', '0'], value: 'no array traversal' },
      ],
      'userB',
      3,
    );

    expect(invalid.success).toBe(false);
    expect(await documents[0].read()).toEqual(before);
  });

  it('allows only one same-revision writer and keeps concurrent content and text namespaces', async () => {
    await documents[0].set({ state: { content: { keep: true } } }, 'owner', -1, false);
    const results = await Promise.all(
      documents.map((document, index) =>
        document.patchNested(
          ['state', 'content'],
          ['state', 'contentRevision'],
          [{ op: 'set', path: ['winner'], value: index }],
          'writer',
          0,
        ),
      ),
    );

    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(results.filter((result) => result.conflict)).toHaveLength(1);
    const updates = await Promise.all([
      documents[0].compareAndSwapNested(['state', 'texts', 'body'], undefined, 'encoded-Yjs-state', 'userA'),
      documents[1].patchNested(
        ['state', 'content'],
        ['state', 'contentRevision'],
        [{ op: 'set', path: ['title'], value: 'Separate metadata' }],
        'userB',
      ),
    ]);
    expect(updates.every((result) => result.success)).toBe(true);
    expect((await documents[0].read())?.data.state).toEqual({
      content: {
        keep: true,
        winner: results.find((result) => result.success)?.doc?.data.state?.content.winner,
        title: 'Separate metadata',
      },
      contentRevision: 2,
      texts: { body: 'encoded-Yjs-state' },
    });
  });

  it('distinguishes missing and null CAS values and conditions an entire multi-path write', async () => {
    await documents[0].set({ boardState: { boardA: { nullable: null } }, ownerId: 'owner' }, 'owner', -1, false);
    expect(await documents[1].compareAndSwapNested(['boardState', 'boardA', 'nullable'], undefined, 'blocked', 'userB')).toMatchObject({
      success: false,
      conflict: true,
    });
    expect((await documents[0].compareAndSwapNested(['boardState', 'boardA', 'nullable'], null, 'allowed', 'userA')).success).toBe(true);
    expect((await documents[1].compareAndSwapNested(['boardState', 'boardA', 'nullable'], null, 'stale', 'userB')).conflict).toBe(true);
    const before = await documents[0].read();
    const failed = await documents[1].updateNestedMany(
      [
        { segments: ['boardGrants', 'boardA'], value: 'new' },
        { segments: ['ownerId'], value: 'new-owner' },
      ],
      'userB',
      [{ segments: ['ownerId'], value: 'stale-owner' }],
    );

    expect(failed.conflict).toBe(true);
    expect(await documents[0].read()).toEqual(before);
    const updated = await documents[0].updateNestedMany(
      [
        { segments: ['boardGrants', 'boardA'], value: 'new' },
        { segments: ['ownerId'], value: 'new-owner' },
      ],
      'owner',
      [{ segments: ['ownerId'], value: 'owner' }],
    );

    expect(updated.success).toBe(true);
    expect((await documents[0].read())?.data).toEqual({
      boardState: { boardA: { nullable: 'allowed' } },
      boardGrants: { boardA: 'new' },
      ownerId: 'new-owner',
    });
  });
});

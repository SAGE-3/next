/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SBAuthDatabase } from './SBAuthDatabase';

/**
 * Minimal in-memory stand-in for the slice of RedisClientType this module
 * actually uses (json.set/get/del, ft.dropIndex/create/search, duplicate,
 * connect, keys). Real behavior, not a mock that just records calls —
 * json.set/get operate on a real backing Map so findOrAddAuth's
 * find-then-add logic is exercised against genuine read-your-own-writes
 * semantics.
 */
function createFakeRedisClient() {
  const store = new Map<string, unknown>();
  const client = {
    duplicate: () => client,
    connect: async () => undefined,
    keys: async (pattern: string) => {
      const prefix = pattern.replace(/\*$/, '');
      return [...store.keys()].filter((k) => k.startsWith(prefix));
    },
    ft: {
      dropIndex: async () => undefined,
      create: async () => undefined,
      search: async (_index: string, query: string) => {
        const emailMatch = query.match(/@email:\{([^}]+)\}/);
        const email = emailMatch ? emailMatch[1].replace(/\\(.)/g, '$1') : undefined;
        const documents = [...store.values()]
          .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object' && (v as any).email === email)
          .map((value) => ({ value }));
        return { documents };
      },
    },
    json: {
      set: async (key: string, path: string, value: unknown) => {
        if (path === '.') store.set(key, value);
        return 'OK';
      },
      get: async (key: string) => store.get(key) ?? null,
      del: async (key: string) => (store.delete(key) ? 1 : 0),
    },
  };
  return client;
}

describe('SBAuthDatabase — CRUD', () => {
  let db: SBAuthDatabase;

  beforeEach(async () => {
    db = new SBAuthDatabase();
    await db.init(createFakeRedisClient() as any, 'test');
  });

  it('addAuth persists a new record and returns it', async () => {
    const auth = await db.addAuth('google', 'google-id-1', { displayName: 'Alice', email: 'alice@example.com' });
    expect(auth).toMatchObject({ provider: 'google', providerId: 'google-id-1', displayName: 'Alice', email: 'alice@example.com' });
    expect(auth?.id).toBeTruthy();
  });

  it('readAuth returns null for a record that was never created', async () => {
    const auth = await db.readAuth('google', 'nonexistent');
    expect(auth).toBeNull();
  });

  it('readAuth returns a previously added record', async () => {
    await db.addAuth('google', 'google-id-2', { displayName: 'Bob', email: 'bob@example.com' });
    const auth = await db.readAuth('google', 'google-id-2');
    expect(auth?.displayName).toBe('Bob');
  });

  it('findOrAddAuth creates a new record on first call', async () => {
    const auth = await db.findOrAddAuth('google', 'google-id-3', { displayName: 'Carol' });
    expect(auth?.displayName).toBe('Carol');
  });

  it('findOrAddAuth returns the existing record on a later call, unchanged', async () => {
    const first = await db.findOrAddAuth('google', 'google-id-4', { displayName: 'Dave' });
    const second = await db.findOrAddAuth('google', 'google-id-4', { displayName: 'Dave (renamed)' });
    // Existing record wins — findOrAddAuth doesn't update on a hit.
    expect(second?.id).toBe(first?.id);
    expect(second?.displayName).toBe('Dave');
  });

  it('deleteAuth removes an existing record and returns true', async () => {
    await db.addAuth('google', 'google-id-5', { displayName: 'Eve' });
    const deleted = await db.deleteAuth('google', 'google-id-5');
    expect(deleted).toBe(true);
    expect(await db.readAuth('google', 'google-id-5')).toBeNull();
  });

  it('deleteAuth returns false for a record that does not exist', async () => {
    expect(await db.deleteAuth('google', 'nonexistent')).toBe(false);
  });

  it('deleteAuthByEmail finds and removes the matching record', async () => {
    await db.addAuth('google', 'google-id-6', { displayName: 'Frank', email: 'frank@example.com' });
    const deleted = await db.deleteAuthByEmail('frank@example.com');
    expect(deleted?.displayName).toBe('Frank');
    expect(await db.readAuth('google', 'google-id-6')).toBeNull();
  });

  it('deleteAuthByEmail returns undefined when no record matches', async () => {
    expect(await db.deleteAuthByEmail('nobody@example.com')).toBeUndefined();
  });
});

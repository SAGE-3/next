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
      set: async (key: string, path: string, value: unknown, options?: { NX?: true; XX?: true }) => {
        if (options?.NX && store.has(key)) {
          return null;
        }
        if (path === '.') {
          store.set(key, value);
        } else {
          // Only '$.role' is used for partial updates in this module.
          const existing = (store.get(key) as Record<string, unknown>) ?? {};
          const field = path.replace(/^\$\./, '');
          store.set(key, { ...existing, [field]: value });
        }
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

describe('SBAuthDatabase — role persistence', () => {
  let db: SBAuthDatabase;

  beforeEach(async () => {
    db = new SBAuthDatabase();
    await db.init(createFakeRedisClient() as any, 'test');
  });

  it('persists role when provided on creation', async () => {
    const auth = await db.addAuth('ldap', 'uid=alice', { displayName: 'Alice', email: 'alice@example.com', role: 'admin' });
    expect(auth?.role).toBe('admin');
  });

  it('omits role when not provided (backward compatible with non-LDAP providers)', async () => {
    const auth = await db.addAuth('google', 'google-id-10', { displayName: 'Bob', email: 'bob@example.com' });
    expect(auth?.role).toBeUndefined();
  });

  it('findOrAddAuth creates a new record with the resolved role on first login', async () => {
    const auth = await db.findOrAddAuth('ldap', 'uid=alice', { displayName: 'Alice', role: 'admin' });
    expect(auth?.role).toBe('admin');
  });

  it('findOrAddAuth re-syncs the persisted role when a later login resolves a different one', async () => {
    // First login: alice is in the admin group.
    await db.findOrAddAuth('ldap', 'uid=alice', { displayName: 'Alice', role: 'admin' });
    // Second login: alice has since been removed from the admin group and now
    // only matches the default role. This must take effect immediately —
    // access granted by group membership must also be revoked by it.
    const auth = await db.findOrAddAuth('ldap', 'uid=alice', { displayName: 'Alice', role: 'spectator' });
    expect(auth?.role).toBe('spectator');
  });

  it('findOrAddAuth leaves the role unchanged when the resolved role is the same', async () => {
    await db.findOrAddAuth('ldap', 'uid=bob', { displayName: 'Bob', role: 'user' });
    const auth = await db.findOrAddAuth('ldap', 'uid=bob', { displayName: 'Bob', role: 'user' });
    expect(auth?.role).toBe('user');
  });

  it('findOrAddAuth does not touch an existing role when no role is supplied (non-LDAP providers)', async () => {
    await db.addAuth('google', 'google-id-11', { displayName: 'Carol', role: 'admin' });
    // A provider that never resolves a role (e.g. google) must not silently
    // wipe out whatever role happened to be there.
    const auth = await db.findOrAddAuth('google', 'google-id-11', { displayName: 'Carol' });
    expect(auth?.role).toBe('admin');
  });

  it('a pre-existing record created before this feature (no role field at all) gets the role backfilled on next login', async () => {
    await db.addAuth('ldap', 'uid=dave', { displayName: 'Dave' });
    const auth = await db.findOrAddAuth('ldap', 'uid=dave', { displayName: 'Dave', role: 'user' });
    expect(auth?.role).toBe('user');
  });

  it('addAuth does not overwrite a record that already exists (TOCTOU guard)', async () => {
    // Simulates two concurrent first-time logins for the same identity both
    // passing findOrAddAuth's readAuth() check before either has written,
    // and both then calling addAuth. The second call must not silently
    // overwrite the first's record with a different v4() id.
    const first = await db.addAuth('ldap', 'uid=eve', { displayName: 'Eve', role: 'user' });
    const second = await db.addAuth('ldap', 'uid=eve', { displayName: 'Eve', role: 'user' });
    expect(second?.id).toBe(first?.id);
    const persisted = await db.readAuth('ldap', 'uid=eve');
    expect(persisted?.id).toBe(first?.id);
  });
});

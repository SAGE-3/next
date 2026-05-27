/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Unit tests for SBAuthDatabase local user management methods.
 * The Redis client is replaced with an in-memory fake to avoid
 * requiring a live Redis instance.
 */

// ── In-memory Redis fake ──────────────────────────────────────────────────────

type HashRecord = Record<string, string>;

class FakeRedis {
  private hashes = new Map<string, HashRecord>();
  private jsons = new Map<string, unknown>();

  async exists(key: string): Promise<number> {
    return this.hashes.has(key) ? 1 : 0;
  }

  async hSet(key: string, fields: Record<string, string>): Promise<number> {
    const existing = this.hashes.get(key) ?? {};
    this.hashes.set(key, { ...existing, ...fields });
    return Object.keys(fields).length;
  }

  async hGetAll(key: string): Promise<Record<string, string> | null> {
    return this.hashes.get(key) ?? {};
  }

  async del(key: string): Promise<number> {
    const had = this.hashes.has(key) || this.jsons.has(key);
    this.hashes.delete(key);
    this.jsons.delete(key);
    return had ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    // Simple glob: replace * with .*
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...this.hashes.keys(), ...this.jsons.keys()].filter((k) => regex.test(k));
  }

  json = {
    set: jest.fn(async (key: string, _path: string, value: unknown) => {
      this.jsons.set(key, value);
      return 'OK';
    }),
    get: jest.fn(async (key: string) => {
      return this.jsons.get(key) ?? null;
    }),
    del: jest.fn(async (key: string) => {
      const had = this.jsons.has(key);
      this.jsons.delete(key);
      return had ? 1 : 0;
    }),
  };

  ft = {
    dropIndex: jest.fn().mockRejectedValue(new Error('index not found')),
    create: jest.fn().mockResolvedValue('OK'),
    search: jest.fn().mockResolvedValue({ documents: [] }),
  };

  duplicate = jest.fn().mockReturnThis();
  connect = jest.fn().mockResolvedValue(undefined);
}

// ── Import the class under test ───────────────────────────────────────────────

// We access the private class via a direct path import so we can create a
// fresh instance injected with our fake Redis.
import { LocalUserRecord, AuthExtras } from './SBAuthDatabase';

// We test the SBAuthDatabase class by constructing a fresh instance and
// reaching into its internals through init().
const SBAuthDatabaseModule = jest.requireActual('./SBAuthDatabase');
const { SBAuthDatabase } = SBAuthDatabaseModule as {
  SBAuthDatabase: new () => {
    init: (client: any, prefix: string) => Promise<void>;
    createLocalUser: (u: string, h: string, d?: string, e?: string) => Promise<LocalUserRecord | undefined>;
    getLocalUser: (u: string) => Promise<LocalUserRecord | undefined>;
    deleteLocalUser: (u: string) => Promise<boolean>;
    listLocalUsers: () => Promise<Omit<LocalUserRecord, 'passwordHash'>[]>;
    findOrAddAuth: (p: string, id: string, extras?: AuthExtras) => Promise<any>;
    addAuth: (p: string, id: string, extras?: AuthExtras) => Promise<any>;
    readAuth: (p: string, id: string) => Promise<any>;
    deleteAuth: (p: string, id: string) => Promise<boolean>;
  };
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SBAuthDatabase — local user management', () => {
  let db: InstanceType<typeof SBAuthDatabase>;
  let redis: FakeRedis;

  beforeEach(async () => {
    redis = new FakeRedis();
    db = new SBAuthDatabase();
    await db.init(redis as any, 'TEST');
  });

  // ── createLocalUser ─────────────────────────────────────────────────────────

  describe('createLocalUser', () => {
    it('creates a new user and returns the record', async () => {
      const record = await db.createLocalUser('alice', 'hash123', 'Alice', 'alice@example.com');

      expect(record).toBeDefined();
      expect(record?.username).toBe('alice');
      expect(record?.passwordHash).toBe('hash123');
      expect(record?.displayName).toBe('Alice');
      expect(record?.email).toBe('alice@example.com');
    });

    it('returns undefined when username already exists', async () => {
      await db.createLocalUser('alice', 'hash1');
      const duplicate = await db.createLocalUser('alice', 'hash2');
      expect(duplicate).toBeUndefined();
    });

    it('stores a createdAt timestamp', async () => {
      const before = new Date().toISOString();
      const record = await db.createLocalUser('bob', 'hash');
      const after = new Date().toISOString();

      expect(record?.createdAt).toBeDefined();
      expect(record!.createdAt >= before).toBe(true);
      expect(record!.createdAt <= after).toBe(true);
    });

    it('defaults displayName and email to empty string', async () => {
      const record = await db.createLocalUser('charlie', 'hash');
      expect(record?.displayName).toBe('');
      expect(record?.email).toBe('');
    });
  });

  // ── getLocalUser ────────────────────────────────────────────────────────────

  describe('getLocalUser', () => {
    it('returns the user record when it exists', async () => {
      await db.createLocalUser('alice', 'hash123', 'Alice', 'alice@example.com');
      const record = await db.getLocalUser('alice');

      expect(record?.username).toBe('alice');
      expect(record?.passwordHash).toBe('hash123');
    });

    it('returns undefined for non-existent user', async () => {
      const record = await db.getLocalUser('nobody');
      expect(record).toBeUndefined();
    });
  });

  // ── deleteLocalUser ─────────────────────────────────────────────────────────

  describe('deleteLocalUser', () => {
    it('returns true and removes the user', async () => {
      await db.createLocalUser('alice', 'hash123');
      const result = await db.deleteLocalUser('alice');

      expect(result).toBe(true);
      expect(await db.getLocalUser('alice')).toBeUndefined();
    });

    it('returns false when user does not exist', async () => {
      const result = await db.deleteLocalUser('nobody');
      expect(result).toBe(false);
    });
  });

  // ── listLocalUsers ──────────────────────────────────────────────────────────

  describe('listLocalUsers', () => {
    it('returns all users without passwordHash', async () => {
      await db.createLocalUser('alice', 'hash1', 'Alice', 'alice@example.com');
      await db.createLocalUser('bob', 'hash2', 'Bob', 'bob@example.com');

      const users = await db.listLocalUsers();
      expect(users).toHaveLength(2);

      const usernames = users.map((u) => u.username).sort();
      expect(usernames).toEqual(['alice', 'bob']);

      // Ensure passwordHash is never exposed
      for (const user of users) {
        expect((user as any).passwordHash).toBeUndefined();
      }
    });

    it('returns empty array when no local users exist', async () => {
      const users = await db.listLocalUsers();
      expect(users).toEqual([]);
    });
  });
});

// ── findOrAddAuth / addAuth ───────────────────────────────────────────────────

describe('SBAuthDatabase — findOrAddAuth', () => {
  let db: InstanceType<typeof SBAuthDatabase>;
  let redis: FakeRedis;

  beforeEach(async () => {
    redis = new FakeRedis();
    db = new SBAuthDatabase();
    await db.init(redis as any, 'TEST');
  });

  it('creates a new auth record when none exists', async () => {
    const extras: AuthExtras = { displayName: 'Alice', email: 'alice@example.com', picture: '' };
    const record = await db.findOrAddAuth('local', 'alice', extras);

    expect(record).toBeDefined();
    expect(record?.provider).toBe('local');
    expect(record?.providerId).toBe('alice');
    expect(record?.displayName).toBe('Alice');
    expect(record?.id).toBeTruthy();
  });

  it('returns existing record on second call without adding a duplicate', async () => {
    const extras: AuthExtras = { displayName: 'Alice', email: 'alice@example.com', picture: '' };
    const first = await db.findOrAddAuth('local', 'alice', extras);
    const second = await db.findOrAddAuth('local', 'alice', extras);

    expect(second?.id).toBe(first?.id);
    expect(redis.json.set).toHaveBeenCalledTimes(1);
  });

  it('generates a unique id for each new auth record', async () => {
    const a = await db.findOrAddAuth('local', 'alice', {});
    const b = await db.findOrAddAuth('google', 'google-id-123', {});

    expect(a?.id).not.toBe(b?.id);
  });
});

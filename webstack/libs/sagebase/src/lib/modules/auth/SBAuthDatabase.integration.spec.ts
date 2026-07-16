/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Integration tests for SBAuthDatabase against a real Redis Stack instance
 * (RedisJSON + RediSearch), not the in-memory fake used in
 * SBAuthDatabase.spec.ts. The unit tests establish the intended contract;
 * this file proves the real ft.create/ft.search/json.set/json.get calls
 * actually work the way that contract assumes — e.g. RediSearch's TAG field
 * escaping for email lookups, and RedisJSON's `.` root-path semantics.
 *
 * Requires a reachable Redis Stack server (RedisJSON + RediSearch modules).
 * Set REDIS_TEST_URL to point at one; CI provides this via a service
 * container (see .github/workflows/test_webstack.yaml). Skips entirely if
 * unset, so `yarn test` still runs cleanly on a machine without Redis.
 */

import { createClient, RedisClientType } from 'redis';
import { SBAuthDatabase } from './SBAuthDatabase';

const REDIS_URL = process.env.REDIS_TEST_URL;
const describeIfRedis = REDIS_URL ? describe : describe.skip;

describeIfRedis('SBAuthDatabase — integration (real Redis Stack)', () => {
  let redisClient: RedisClientType;
  let db: SBAuthDatabase;
  // Unique per test run so repeated local runs against a persistent Redis
  // don't collide with leftover keys/index from a previous run.
  const prefix = `sbauth-it-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  beforeAll(async () => {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', () => {
      /* ignore socket errors emitted during teardown */
    });
    await redisClient.connect();
    db = new SBAuthDatabase();
    await db.init(redisClient as unknown as RedisClientType, prefix);
  });

  afterAll(async () => {
    const keys = await redisClient.keys(`${prefix}:DB:*`);
    if (keys.length) await redisClient.del(keys);
    // db.init() duplicates the client into a second connection it never
    // exposes; close it too, or the jest worker is left with an open handle
    // and crashes on an unhandled socket 'error' at exit.
    const duplicated = (db as unknown as { _redisClient?: RedisClientType })._redisClient;
    if (duplicated) {
      duplicated.on('error', () => {
        /* ignore socket errors emitted during teardown */
      });
      if (duplicated.isOpen) await duplicated.quit();
    }
    await redisClient.quit();
  });

  it('persists a record through real RedisJSON and reads it back intact', async () => {
    const written = await db.addAuth('google', 'real-redis-1', { displayName: 'Alice', email: 'alice@example.com' });
    expect(written?.id).toBeTruthy();

    const read = await db.readAuth('google', 'real-redis-1');
    expect(read).toMatchObject({
      provider: 'google',
      providerId: 'real-redis-1',
      displayName: 'Alice',
      email: 'alice@example.com',
    });
    expect(read?.id).toBe(written?.id);
  });

  it('readAuth returns null for a key that was never written, against real RedisJSON', async () => {
    const result = await db.readAuth('google', 'never-written');
    expect(result).toBeNull();
  });

  it('findOrAddAuth is idempotent across two real round-trips for the same identity', async () => {
    const first = await db.findOrAddAuth('google', 'real-redis-2', { displayName: 'Bob' });
    const second = await db.findOrAddAuth('google', 'real-redis-2', { displayName: 'Bob' });
    expect(second?.id).toBe(first?.id);
  });

  it('deleteAuth actually removes the key from Redis, not just from a local cache', async () => {
    await db.addAuth('google', 'real-redis-3', { displayName: 'Carol' });
    expect(await db.deleteAuth('google', 'real-redis-3')).toBe(true);
    // Read directly from Redis (bypassing the class) to prove it's really gone,
    // not just that db's own readAuth has some caching layer.
    const raw = await redisClient.json.get(`${prefix}:DB:googlereal-redis-3`);
    expect(raw).toBeNull();
  });

  it('deleteAuthByEmail exercises the real RediSearch TAG index, including special characters', async () => {
    // '@' and '.' are exactly the characters deleteAuthByEmail escapes before
    // building the RediSearch query — this is the real reason to test against
    // a genuine index rather than a fake that just does a linear scan.
    await db.addAuth('google', 'real-redis-4', { displayName: 'Dave', email: 'dave.smith@example.com' });
    const deleted = await db.deleteAuthByEmail('dave.smith@example.com');
    expect(deleted?.displayName).toBe('Dave');
    expect(await db.readAuth('google', 'real-redis-4')).toBeNull();
  });

  it('deleteAuthByEmail finds a hyphenated email against the real RediSearch TAG index', async () => {
    // Regression test: RediSearch TAG queries treat '-' as a syntax
    // character. Only escaping '@'/'.' let this throw a real syntax error
    // that the method's catch block silently swallowed as "no match" — a
    // fake linear-scan search would never have caught this.
    await db.addAuth('google', 'real-redis-5', { displayName: 'Jean-Pierre', email: 'jean-pierre@example.com' });
    const deleted = await db.deleteAuthByEmail('jean-pierre@example.com');
    expect(deleted?.displayName).toBe('Jean-Pierre');
    expect(await db.readAuth('google', 'real-redis-5')).toBeNull();
  });

  it('deleteAuthByEmail finds a plus-addressed email against the real RediSearch TAG index', async () => {
    await db.addAuth('google', 'real-redis-6', { displayName: 'Grace', email: 'grace+sage3@example.com' });
    const deleted = await db.deleteAuthByEmail('grace+sage3@example.com');
    expect(deleted?.displayName).toBe('Grace');
    expect(await db.readAuth('google', 'real-redis-6')).toBeNull();
  });

  it('deleteAuthByEmail returns undefined against a real (empty) search result', async () => {
    const result = await db.deleteAuthByEmail('nobody-real@example.com');
    expect(result).toBeUndefined();
  });
});

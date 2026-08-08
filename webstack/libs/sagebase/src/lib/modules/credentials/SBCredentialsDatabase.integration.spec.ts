/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 * Real Redis Stack integration test, gated on REDIS_TEST_URL (same
 * convention as SBAuthDatabase.integration.spec.ts). Run locally with:
 *   docker run -d --name credentials-test-redis -p 16400:6379 redis/redis-stack-server:latest
 *   REDIS_TEST_URL=redis://localhost:16400 npx nx test sagebase --testPathPattern=SBCredentialsDatabase.integration
 *   docker stop credentials-test-redis && docker rm credentials-test-redis
 */

import { createClient } from 'redis';
import { SBCredentialsDatabase } from './SBCredentialsDatabase';

const REDIS_URL = process.env.REDIS_TEST_URL;
const describeIfRedis = REDIS_URL ? describe : describe.skip;

describeIfRedis('SBCredentialsDatabase — real Redis Stack integration', () => {
  let db: SBCredentialsDatabase;
  let redisClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    redisClient = createClient({ url: REDIS_URL });
    await redisClient.connect();
    db = new SBCredentialsDatabase();
    await db.init(redisClient as any, `credentials-test-${Date.now()}`, 'integration-test-encryption-key');
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  it('persists and retrieves an encrypted secretText credential across a fresh readById', async () => {
    const created = await db.createOrUpdate('real-redis-user-1', 'secretText', 'ctfd-token', {
      type: 'secretText',
      secret: 'ctfd_realredistoken',
    });
    const decrypted = await db.getDecryptedValue(created.id, 'real-redis-user-1');
    expect(decrypted).toEqual({ type: 'secretText', secret: 'ctfd_realredistoken' });
  });

  it('lists only the real Redis-persisted credentials owned by the given user', async () => {
    await db.createOrUpdate('real-redis-user-2', 'secretText', 'a', { type: 'secretText', secret: 's1' });
    await db.createOrUpdate('real-redis-user-3', 'secretText', 'b', { type: 'secretText', secret: 's2' });

    const list = await db.list('real-redis-user-2');
    expect(list.map((c) => c.name)).toEqual(['a']);
  });

  it('handles an ownerId with hyphens (real v4 UUID) against real RediSearch without a syntax error', async () => {
    const ownerId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    await db.createOrUpdate(ownerId, 'secretText', 'hyphen-test', { type: 'secretText', secret: 'v' });
    const list = await db.list(ownerId);
    expect(list).toHaveLength(1);
  });

  it('updateValue re-encrypts and persists the new value, readable after another getDecryptedValue call', async () => {
    const created = await db.createOrUpdate('real-redis-user-4', 'secretText', 'rotatable', {
      type: 'secretText',
      secret: 'v1',
    });
    await db.updateValue(created.id, 'real-redis-user-4', { type: 'secretText', secret: 'v2' });
    const decrypted = await db.getDecryptedValue(created.id, 'real-redis-user-4');
    expect(decrypted).toEqual({ type: 'secretText', secret: 'v2' });
  });

  it('delete actually removes the document from real Redis', async () => {
    const created = await db.createOrUpdate('real-redis-user-5', 'secretText', 'to-delete', {
      type: 'secretText',
      secret: 'v',
    });
    expect(await db.delete(created.id, 'real-redis-user-5')).toBe(true);
    expect(await db.getDecryptedValue(created.id, 'real-redis-user-5')).toBeUndefined();
  });
});

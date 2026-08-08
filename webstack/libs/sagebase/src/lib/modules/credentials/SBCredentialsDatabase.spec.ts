/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 * Fake Redis client backed by a real in-memory Map, matching only the
 * json.set/get/del and ft.dropIndex/create/search shape SBCredentialsDatabase
 * actually uses (same convention as SBAuthDatabase.spec.ts).
 */

import { SBCredentialsDatabase } from './SBCredentialsDatabase';

function createFakeRedisClient() {
  const store = new Map<string, unknown>();
  const client = {
    duplicate: () => client,
    connect: async () => undefined,
    ft: {
      dropIndex: async () => undefined,
      create: async () => 'OK',
      search: async (_index: string, query: string) => {
        // Parses the exact query shapes this module issues:
        //   @ownerId:{escaped}
        //   @ownerId:{escaped} @type:{escaped}
        const ownerMatch = query.match(/@ownerId:\{([^}]*)\}/);
        const typeMatch = query.match(/@type:\{([^}]*)\}/);
        const unescape = (s: string) => s.replace(/\\(.)/g, '$1');
        const ownerId = ownerMatch ? unescape(ownerMatch[1]) : undefined;
        const type = typeMatch ? unescape(typeMatch[1]) : undefined;

        const documents = Array.from(store.entries())
          .filter(([, value]: [string, any]) => {
            if (ownerId !== undefined && value.ownerId !== ownerId) return false;
            if (type !== undefined && value.type !== type) return false;
            return true;
          })
          .map(([key, value]) => ({ id: key, value }));
        return { total: documents.length, documents };
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

describe('SBCredentialsDatabase', () => {
  let db: SBCredentialsDatabase;

  beforeEach(async () => {
    db = new SBCredentialsDatabase();
    await db.init(createFakeRedisClient() as any, 'test', 'a-test-encryption-key');
  });

  it('createOrUpdate creates a new credential and never returns the value', async () => {
    const result = await db.createOrUpdate('user-1', 'secretText', 'my-ctfd-token', { type: 'secretText', secret: 'ctfd_abc' });
    expect(result).toMatchObject({ ownerId: 'user-1', type: 'secretText', name: 'my-ctfd-token' });
    expect(result.id).toBeTruthy();
    expect((result as any).encryptedValue).toBeUndefined();
    expect((result as any).secret).toBeUndefined();
  });

  it('createOrUpdate with an existing (ownerId, type, name) updates in place, keeping the same id', async () => {
    const first = await db.createOrUpdate('user-1', 'secretText', 'my-token', { type: 'secretText', secret: 'old-value' });
    const second = await db.createOrUpdate('user-1', 'secretText', 'my-token', { type: 'secretText', secret: 'new-value' });
    expect(second.id).toBe(first.id);
    expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt);

    const decrypted = await db.getDecryptedValue(first.id, 'user-1');
    expect(decrypted).toEqual({ type: 'secretText', secret: 'new-value' });
  });

  it('allows the same name to be reused across different types for the same user', async () => {
    const asSecret = await db.createOrUpdate('user-1', 'secretText', 'GitHub', { type: 'secretText', secret: 'tok' });
    const asUserPass = await db.createOrUpdate('user-1', 'usernamePassword', 'GitHub', {
      type: 'usernamePassword',
      username: 'me',
      password: 'pw',
    });
    expect(asSecret.id).not.toBe(asUserPass.id);

    const list = await db.list('user-1');
    expect(list).toHaveLength(2);
  });

  it('list returns only the calling owner\'s credentials, without values', async () => {
    await db.createOrUpdate('user-1', 'secretText', 'a', { type: 'secretText', secret: 's1' });
    await db.createOrUpdate('user-2', 'secretText', 'b', { type: 'secretText', secret: 's2' });

    const list = await db.list('user-1');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('a');
    expect((list[0] as any).encryptedValue).toBeUndefined();
  });

  it('list filters by type when provided', async () => {
    await db.createOrUpdate('user-1', 'secretText', 'a', { type: 'secretText', secret: 's1' });
    await db.createOrUpdate('user-1', 'usernamePassword', 'b', { type: 'usernamePassword', username: 'u', password: 'p' });

    const secretsOnly = await db.list('user-1', 'secretText');
    expect(secretsOnly).toHaveLength(1);
    expect(secretsOnly[0].name).toBe('a');
  });

  it('updateValue replaces the value for an owned credential, keeping name/id/type', async () => {
    const created = await db.createOrUpdate('user-1', 'secretText', 'my-token', { type: 'secretText', secret: 'v1' });
    const updated = await db.updateValue(created.id, 'user-1', { type: 'secretText', secret: 'v2' });
    expect(updated).toMatchObject({ id: created.id, name: 'my-token', type: 'secretText' });

    const decrypted = await db.getDecryptedValue(created.id, 'user-1');
    expect(decrypted).toEqual({ type: 'secretText', secret: 'v2' });
  });

  it('updateValue returns undefined when the credential belongs to a different owner', async () => {
    const created = await db.createOrUpdate('user-1', 'secretText', 'my-token', { type: 'secretText', secret: 'v1' });
    const result = await db.updateValue(created.id, 'user-2', { type: 'secretText', secret: 'stolen' });
    expect(result).toBeUndefined();

    // Confirm the original value was untouched.
    const decrypted = await db.getDecryptedValue(created.id, 'user-1');
    expect(decrypted).toEqual({ type: 'secretText', secret: 'v1' });
  });

  it('updateValue returns undefined for a non-existent id', async () => {
    const result = await db.updateValue('does-not-exist', 'user-1', { type: 'secretText', secret: 'x' });
    expect(result).toBeUndefined();
  });

  it('delete removes an owned credential and returns true', async () => {
    const created = await db.createOrUpdate('user-1', 'secretText', 'my-token', { type: 'secretText', secret: 'v1' });
    expect(await db.delete(created.id, 'user-1')).toBe(true);
    expect(await db.list('user-1')).toHaveLength(0);
  });

  it('delete returns false when the credential belongs to a different owner, and does not delete it', async () => {
    const created = await db.createOrUpdate('user-1', 'secretText', 'my-token', { type: 'secretText', secret: 'v1' });
    expect(await db.delete(created.id, 'user-2')).toBe(false);
    expect(await db.list('user-1')).toHaveLength(1);
  });

  it('delete returns false for a non-existent id', async () => {
    expect(await db.delete('does-not-exist', 'user-1')).toBe(false);
  });

  it('getDecryptedValue returns undefined for a non-existent id', async () => {
    expect(await db.getDecryptedValue('does-not-exist', 'user-1')).toBeUndefined();
  });

  it('getDecryptedValue returns undefined when the credential belongs to a different owner', async () => {
    const created = await db.createOrUpdate('user-1', 'secretText', 'my-token', { type: 'secretText', secret: 'v1' });
    expect(await db.getDecryptedValue(created.id, 'user-2')).toBeUndefined();
  });

  it('getDecryptedValue returns the original value for the owner (encrypt -> store -> decrypt round-trip)', async () => {
    const created = await db.createOrUpdate('user-1', 'usernamePassword', 'svc', {
      type: 'usernamePassword',
      username: 'svc-account',
      password: 'hunter2',
    });
    expect(await db.getDecryptedValue(created.id, 'user-1')).toEqual({
      type: 'usernamePassword',
      username: 'svc-account',
      password: 'hunter2',
    });
  });

  it('correctly round-trips an ownerId containing hyphens (a real v4 UUID shape)', async () => {
    // Regression coverage: RediSearch TAG queries treat '-' as a syntax
    // character. ownerId here is always a v4 UUID (SBAuthSchema.id), which
    // always contains hyphens — this must work from the very first query.
    const ownerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    await db.createOrUpdate(ownerId, 'secretText', 'my-token', { type: 'secretText', secret: 'v1' });
    const list = await db.list(ownerId);
    expect(list).toHaveLength(1);
  });
});

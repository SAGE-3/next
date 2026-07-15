/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 * Real Express + supertest integration test for the /api/credentials REST
 * routes, against a real Redis Stack instance (gated on REDIS_TEST_URL,
 * same convention as SBAuthDatabase.integration.spec.ts and
 * permissions.integration.spec.ts).
 */

import express from 'express';
import request from 'supertest';
import { createClient } from 'redis';
import { SBCredentialsDatabase } from '@sage3/sagebase';
import { CredentialsRouter } from './credentialsRouterTestHelper';

const REDIS_URL = process.env.REDIS_TEST_URL;
const describeIfRedis = REDIS_URL ? describe : describe.skip;

function buildApp(userId: string, db: SBCredentialsDatabase) {
  const app = express();
  // Deliberately no global express.json() on this test app — even though
  // the real apps/homebase app does have one globally
  // (apps/homebase/src/web/http-server.ts:73), this test intentionally
  // doesn't rely on it, so it only passes if the router provides its own
  // parsing (a stricter check than production actually needs, kept so
  // this router stays self-sufficient/testable in isolation).
  app.use((req, _res, next) => {
    (req as express.Request & { user: { id: string } }).user = { id: userId };
    next();
  });
  app.use('/api/credentials', CredentialsRouter(db));
  return app;
}

describeIfRedis('CredentialsRouter — real Express + real Redis integration', () => {
  let db: SBCredentialsDatabase;
  let redisClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    redisClient = createClient({ url: REDIS_URL });
    await redisClient.connect();
    db = new SBCredentialsDatabase();
    await db.init(redisClient as any, `credentials-route-test-${Date.now()}`, 'route-test-key');
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  it('POST creates a credential and never returns the value', async () => {
    const app = buildApp('user-a', db);
    const res = await request(app)
      .post('/api/credentials')
      .send({ name: 'ctfd-token', type: 'secretText', value: { type: 'secretText', secret: 'ctfd_abc' } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'ctfd-token', type: 'secretText', ownerId: 'user-a' });
    expect(res.body.encryptedValue).toBeUndefined();
    expect(res.body.value).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('ctfd_abc');
  });

  it('POST returns 400 with a JSON body (not a crash) when name is missing', async () => {
    const app = buildApp('user-validation-1', db);
    const res = await request(app)
      .post('/api/credentials')
      .send({ type: 'secretText', value: { type: 'secretText', secret: 's' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('name');
  });

  it('POST returns 400 when type is not one of the known credential types', async () => {
    const app = buildApp('user-validation-2', db);
    const res = await request(app)
      .post('/api/credentials')
      .send({ name: 'x', type: 'bogusType', value: { secret: 's' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('type');
  });

  it('POST returns 400 when value is missing the field required for the given type', async () => {
    const app = buildApp('user-validation-3', db);
    const res = await request(app)
      .post('/api/credentials')
      .send({ name: 'x', type: 'usernamePassword', value: { type: 'usernamePassword', username: 'u' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('password');
  });

  it('GET lists only the calling user\'s own credentials', async () => {
    const appA = buildApp('user-b', db);
    const appC = buildApp('user-c', db);
    await request(appA).post('/api/credentials').send({ name: 'x', type: 'secretText', value: { type: 'secretText', secret: 's1' } });
    await request(appC).post('/api/credentials').send({ name: 'y', type: 'secretText', value: { type: 'secretText', secret: 's2' } });

    const res = await request(appA).get('/api/credentials');
    expect(res.status).toBe(200);
    expect(res.body.map((c: any) => c.name)).toEqual(['x']);
  });

  it('GET ?type= filters by credential type', async () => {
    const app = buildApp('user-d', db);
    await request(app).post('/api/credentials').send({ name: 'a', type: 'secretText', value: { type: 'secretText', secret: 's' } });
    await request(app)
      .post('/api/credentials')
      .send({ name: 'b', type: 'usernamePassword', value: { type: 'usernamePassword', username: 'u', password: 'p' } });

    const res = await request(app).get('/api/credentials?type=secretText');
    expect(res.body.map((c: any) => c.name)).toEqual(['a']);
  });

  it('PUT rotates the value for an owned credential', async () => {
    const app = buildApp('user-e', db);
    const createRes = await request(app)
      .post('/api/credentials')
      .send({ name: 'rotatable', type: 'secretText', value: { type: 'secretText', secret: 'v1' } });

    const putRes = await request(app)
      .put(`/api/credentials/${createRes.body.id}`)
      .send({ value: { type: 'secretText', secret: 'v2' } });
    expect(putRes.status).toBe(200);
    expect(putRes.body.id).toBe(createRes.body.id);
  });

  it('PUT returns 404 when the credential belongs to a different user', async () => {
    const owner = buildApp('user-f', db);
    const attacker = buildApp('user-g', db);
    const createRes = await request(owner)
      .post('/api/credentials')
      .send({ name: 'mine', type: 'secretText', value: { type: 'secretText', secret: 'v1' } });

    const res = await request(attacker)
      .put(`/api/credentials/${createRes.body.id}`)
      .send({ value: { type: 'secretText', secret: 'stolen' } });
    expect(res.status).toBe(404);
  });

  it('DELETE removes an owned credential', async () => {
    const app = buildApp('user-h', db);
    const createRes = await request(app)
      .post('/api/credentials')
      .send({ name: 'to-delete', type: 'secretText', value: { type: 'secretText', secret: 'v' } });

    const deleteRes = await request(app).delete(`/api/credentials/${createRes.body.id}`);
    expect(deleteRes.status).toBe(200);

    const listRes = await request(app).get('/api/credentials');
    expect(listRes.body).toHaveLength(0);
  });

  it('DELETE returns 404 when the credential belongs to a different user, and does not delete it', async () => {
    const owner = buildApp('user-i', db);
    const attacker = buildApp('user-j', db);
    const createRes = await request(owner)
      .post('/api/credentials')
      .send({ name: 'mine', type: 'secretText', value: { type: 'secretText', secret: 'v' } });

    const deleteRes = await request(attacker).delete(`/api/credentials/${createRes.body.id}`);
    expect(deleteRes.status).toBe(404);

    const listRes = await request(owner).get('/api/credentials');
    expect(listRes.body).toHaveLength(1);
  });
});

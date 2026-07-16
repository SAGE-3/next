/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Integration test for checkPermissionsREST — the actual Express middleware,
 * as opposed to permissions.spec.ts's unit tests of the extracted pure logic
 * (checkPermissionsWS). This exercises it wired into a real Express app via
 * real HTTP requests (supertest), so it proves the middleware genuinely
 * calls next() vs. writes a real 403 response — not just that the role/
 * action/resource math it delegates to is correct in isolation.
 */

import express from 'express';
import request from 'supertest';
import { checkPermissionsREST } from './permissions';
import { SBAuthSchema } from '@sage3/sagebase';

function buildApp(auth: SBAuthSchema) {
  const app = express();
  // Stand-in for Passport's session deserialization, which normally
  // populates req.user before any route-level middleware runs.
  app.use((req, _res, next) => {
    (req as express.Request & { user: SBAuthSchema }).user = auth;
    next();
  });
  app.post('/apps', checkPermissionsREST('APPS'), (_req, res) => res.status(201).json({ created: true }));
  app.get('/apps', checkPermissionsREST('APPS'), (_req, res) => res.status(200).json({ items: [] }));
  app.delete('/apps', checkPermissionsREST('APPS'), (_req, res) => res.status(200).json({ deleted: true }));
  return app;
}

describe('checkPermissionsREST — integration (real Express + HTTP)', () => {
  it('an admin-mapped user gets a real 201 from the route handler on POST', async () => {
    const app = buildApp({ provider: 'admin', providerId: 'admin-1', id: 'auth-1' });
    const res = await request(app).post('/apps');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ created: true });
  });

  it('a spectator-mapped user gets a real 403 response on POST, route handler never runs', async () => {
    const app = buildApp({ provider: 'spectator', providerId: 'spec-1', id: 'auth-2' });
    const res = await request(app).post('/apps');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Forbidden user' });
  });

  it('a spectator-mapped user still gets a real 200 on GET (read is allowed)', async () => {
    const app = buildApp({ provider: 'spectator', providerId: 'spec-2', id: 'auth-3' });
    const res = await request(app).get('/apps');
    expect(res.status).toBe(200);
  });

  it('a guest-mapped user gets a real 201 on POST (the current guest role can create apps)', async () => {
    const app = buildApp({ provider: 'guest', providerId: 'guest-1', id: 'auth-4' });
    const res = await request(app).post('/apps');
    expect(res.status).toBe(201);
  });

  it('a guest-mapped user gets a real 403 on DELETE (no role grants guests delete)', async () => {
    const app = buildApp({ provider: 'guest', providerId: 'guest-2', id: 'auth-5' });
    const res = await request(app).delete('/apps');
    expect(res.status).toBe(403);
  });
});

describe('checkPermissionsREST — unrecognized provider', () => {
  // Regression test: an auth record whose provider isn't in
  // providerToRoleMap previously hit `return false;` inside the Express
  // middleware — a no-op against Middleware's void return type, so the
  // request got neither next() nor a response and hung forever. Bounded
  // with a real timeout so a regression here fails the test instead of
  // hanging the whole suite.
  it('gets a real 403 response instead of the request hanging', async () => {
    const app = buildApp({ provider: 'totally-unrecognized', providerId: 'x', id: 'y' });
    const res = await request(app).post('/apps').timeout({ response: 3000, deadline: 4000 });
    expect(res.status).toBe(403);
  }, 5000);
});

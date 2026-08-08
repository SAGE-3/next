/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 * Real Express + supertest integration test for the ssh integration
 * handler. The connection registry's connect() is injected directly
 * (already unit-tested against a mocked ssh2.Client in Task 1) — this
 * test's job is to verify the HTTP layer: validation, status codes, and
 * that req.user.id is what's passed through as ownerId.
 */

import express from 'express';
import request from 'supertest';
import { SSHIntegrationRouterTestHelper } from './sshIntegrationRouterTestHelper';
import { ConnectParams, ConnectResult } from '@sage3/backend';

type ListSessionsResult = { success: true; sessions: string[] } | { success: false; error: 'auth_failed' | 'unreachable' | 'credential_unavailable' };

function buildApp(
  userId: string,
  connect: (appId: string, params: ConnectParams) => Promise<ConnectResult>,
  listSessions: (params: ConnectParams) => Promise<ListSessionsResult> = jest.fn(),
  allowedHosts: string[] = ['example.com', 'h']
) {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).user = { id: userId, provider: 'test', providerId: userId };
    next();
  });
  app.use('/api/integrations/ssh', SSHIntegrationRouterTestHelper(connect, listSessions, allowedHosts));
  return app;
}

describe('SSHIntegrationRouter — real Express integration', () => {
  it('returns 200 on a successful connect, passing req.user.id as ownerId and the resolved credentialId back', async () => {
    const connect = jest.fn().mockResolvedValue({ success: true, credentialId: 'cred-1' });
    const app = buildApp('user-1', connect);

    const res = await request(app).post('/api/integrations/ssh/connect').send({
      appId: 'app-abc',
      host: 'example.com',
      port: 22,
      credentialId: 'cred-1',
    });

    expect(res.status).toBe(200);
    // The frontend persists this in the app's own state to reconnect after
    // the last viewer leaves and the SSH connection is torn down — without
    // it in the response, a later reconnect has nothing to look up.
    expect(res.body).toEqual({ success: true, credentialId: 'cred-1' });
    expect(connect).toHaveBeenCalledWith('app-abc', {
      host: 'example.com',
      port: 22,
      ownerId: 'user-1',
      credentialId: 'cred-1',
      newCredential: undefined,
    });
  });

  it('returns 400 when neither credentialId nor newCredential is provided', async () => {
    const connect = jest.fn();
    const app = buildApp('user-1', connect);

    const res = await request(app).post('/api/integrations/ssh/connect').send({ appId: 'a', host: 'h', port: 22 });

    expect(res.status).toBe(400);
    expect(connect).not.toHaveBeenCalled();
  });

  it('returns 400 when newCredential is missing required fields', async () => {
    const connect = jest.fn();
    const app = buildApp('user-1', connect);

    const res = await request(app).post('/api/integrations/ssh/connect').send({
      appId: 'a',
      host: 'h',
      port: 22,
      newCredential: { name: 'incomplete' },
    });

    expect(res.status).toBe(400);
    expect(connect).not.toHaveBeenCalled();
  });

  it('maps auth_failed to 401', async () => {
    const connect = jest.fn().mockResolvedValue({ success: false, error: 'auth_failed' });
    const app = buildApp('user-1', connect);

    const res = await request(app)
      .post('/api/integrations/ssh/connect')
      .send({ appId: 'a', host: 'h', port: 22, credentialId: 'c' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'auth_failed' });
  });

  it('maps unreachable to 502', async () => {
    const connect = jest.fn().mockResolvedValue({ success: false, error: 'unreachable' });
    const app = buildApp('user-1', connect);

    const res = await request(app)
      .post('/api/integrations/ssh/connect')
      .send({ appId: 'a', host: 'h', port: 22, credentialId: 'c' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'unreachable' });
  });

  it('maps tmux_failed to 502', async () => {
    const connect = jest.fn().mockResolvedValue({ success: false, error: 'tmux_failed' });
    const app = buildApp('user-1', connect);

    const res = await request(app)
      .post('/api/integrations/ssh/connect')
      .send({ appId: 'a', host: 'h', port: 22, credentialId: 'c' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'tmux_failed' });
  });

  it('maps credential_unavailable to 500', async () => {
    const connect = jest.fn().mockResolvedValue({ success: false, error: 'credential_unavailable' });
    const app = buildApp('user-1', connect);

    const res = await request(app)
      .post('/api/integrations/ssh/connect')
      .send({ appId: 'a', host: 'h', port: 22, credentialId: 'c' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'credential_unavailable' });
  });

  it('maps session_not_found to 404', async () => {
    const connect = jest.fn().mockResolvedValue({ success: false, error: 'session_not_found' });
    const app = buildApp('user-1', connect);

    const res = await request(app)
      .post('/api/integrations/ssh/connect')
      .send({ appId: 'a', host: 'h', port: 22, credentialId: 'c', sessionName: 'demo-session' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'session_not_found' });
  });

  it('passes sessionName through to connect() when provided', async () => {
    const connect = jest.fn().mockResolvedValue({ success: true, credentialId: 'cred-1' });
    const app = buildApp('user-1', connect);

    const res = await request(app)
      .post('/api/integrations/ssh/connect')
      .send({ appId: 'a', host: 'h', port: 22, credentialId: 'c', sessionName: 'demo-session' });

    expect(res.status).toBe(200);
    expect(connect).toHaveBeenCalledWith('a', {
      host: 'h',
      port: 22,
      ownerId: 'user-1',
      credentialId: 'c',
      newCredential: undefined,
      sessionName: 'demo-session',
    });
  });

  it('returns 400 for an invalid sessionName without calling connect', async () => {
    const connect = jest.fn();
    const app = buildApp('user-1', connect);

    const res = await request(app)
      .post('/api/integrations/ssh/connect')
      .send({ appId: 'a', host: 'h', port: 22, credentialId: 'c', sessionName: 'a;rm -rf' });

    expect(res.status).toBe(400);
    expect(connect).not.toHaveBeenCalled();
  });
});

describe('SSHIntegrationRouter /sessions — real Express integration', () => {
  it('POST /sessions returns the session list', async () => {
    const listSessions = jest.fn().mockResolvedValue({ success: true, sessions: ['demo-session'] });
    const app = buildApp('user-1', jest.fn(), listSessions);

    const res = await request(app)
      .post('/api/integrations/ssh/sessions')
      .send({ host: 'h', port: 22, credentialId: 'c' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sessions: ['demo-session'] });
    expect(listSessions).toHaveBeenCalledWith({
      host: 'h',
      port: 22,
      ownerId: 'user-1',
      credentialId: 'c',
      newCredential: undefined,
    });
  });

  it('maps auth_failed to 401', async () => {
    const listSessions = jest.fn().mockResolvedValue({ success: false, error: 'auth_failed' });
    const app = buildApp('user-1', jest.fn(), listSessions);

    const res = await request(app)
      .post('/api/integrations/ssh/sessions')
      .send({ host: 'h', port: 22, credentialId: 'c' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'auth_failed' });
  });

  it('maps unreachable to 502', async () => {
    const listSessions = jest.fn().mockResolvedValue({ success: false, error: 'unreachable' });
    const app = buildApp('user-1', jest.fn(), listSessions);

    const res = await request(app)
      .post('/api/integrations/ssh/sessions')
      .send({ host: 'h', port: 22, credentialId: 'c' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'unreachable' });
  });

  it('returns 400 when neither credentialId nor newCredential is provided', async () => {
    const listSessions = jest.fn();
    const app = buildApp('user-1', jest.fn(), listSessions);

    const res = await request(app).post('/api/integrations/ssh/sessions').send({ host: 'h', port: 22 });

    expect(res.status).toBe(400);
    expect(listSessions).not.toHaveBeenCalled();
  });

  it('rejects /connect to a host not in the allowlist with 403 host_not_allowed', async () => {
    const connect = jest.fn();
    const app = buildApp('user-1', connect, jest.fn(), ['sandbox.lab']);
    const res = await request(app).post('/api/integrations/ssh/connect').send({ appId: 'a1', host: 'evil.example', port: 22, credentialId: 'c1' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('host_not_allowed');
    expect(connect).not.toHaveBeenCalled();
  });

  it('rejects everything when the allowlist is empty (deny-all default)', async () => {
    const connect = jest.fn();
    const app = buildApp('user-1', connect, jest.fn(), []);
    const res = await request(app).post('/api/integrations/ssh/connect').send({ appId: 'a1', host: 'sandbox.lab', port: 22, credentialId: 'c1' });
    expect(res.status).toBe(403);
    expect(connect).not.toHaveBeenCalled();
  });
});

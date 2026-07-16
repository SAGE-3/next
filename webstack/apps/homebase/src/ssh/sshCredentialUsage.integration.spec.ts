/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 * Real Redis Stack integration test, gated on REDIS_TEST_URL (same
 * convention as SBCredentialsDatabase.integration.spec.ts and
 * SBAuthDatabase.integration.spec.ts).
 *
 * sshConnectionRegistry.spec.ts already covers the registry's own logic
 * (mocking SBCredentialsDB entirely) and SBCredentialsDatabase.integration
 * .spec.ts already covers the store's own encrypt/store/decrypt round trip
 * (against real Redis, with no SSH involved). Neither proves the seam
 * between them: that a credential actually created through the real store
 * -- encrypted, persisted, and later decrypted by SBCredentialsDB's own
 * code, not a mock standing in for it -- is what the registry hands to
 * ssh2 to attempt a connection. This test is that seam, with only the
 * actual network-level ssh2.Client mocked (there's no real SSH server to
 * connect to in CI).
 */

import { createClient } from 'redis';
import { SBCredentialsDB } from '@sage3/sagebase';
import { SSHConnectionRegistry } from './sshConnectionRegistry';

// sshConnectionRegistry.ts imports isValidSessionName from '@sage3/backend'
// by value now, so merely requiring it here (this file's own tests are
// gated behind REDIS_TEST_URL, but the module-level import above still
// runs eagerly) evaluates that whole barrel (libs/backend/src/index.ts),
// which transitively pulls in a 'fuse.js' import this app's tsconfig.spec
// .json (no esModuleInterop) can't load. See the identical note in
// sshConnectionRegistry.spec.ts for the full explanation.
jest.mock('@sage3/backend', () => ({
  isValidSessionName: jest.requireActual('../../../../libs/backend/src/lib/generics/sshTypes').isValidSessionName,
}));

const REDIS_URL = process.env.REDIS_TEST_URL;
const describeIfRedis = REDIS_URL ? describe : describe.skip;

// Mirrors sshConnectionRegistry.spec.ts's own fakes, but captures the
// connect() config so this test can assert on exactly what the registry
// handed ssh2 -- the whole point here is checking those are the real,
// decrypted values, not whatever a mock was told to return.
import { EventEmitter } from 'events';

class FakeStream extends EventEmitter {
  public stderr = new EventEmitter();
  write() {
    return true;
  }
  setWindow() {
    /* no-op */
  }
}

class FakeClient extends EventEmitter {
  public connectConfig: Record<string, unknown> | undefined;
  connect(config: Record<string, unknown>) {
    this.connectConfig = config;
    return this;
  }
  exec(command: string, _opts: unknown, callback: (err: Error | undefined, stream: FakeStream) => void) {
    callback(undefined, new FakeStream());
  }
  end() {
    this.emit('close');
  }
}

let fakeClients: FakeClient[] = [];

jest.mock('ssh2', () => ({
  Client: jest.fn().mockImplementation(() => {
    const client = new FakeClient();
    fakeClients.push(client);
    return client;
  }),
}));

describeIfRedis('SSHConnectionRegistry x SBCredentialsDB — real credential usage, real Redis', () => {
  let redisClient: ReturnType<typeof createClient>;
  let registry: SSHConnectionRegistry;

  beforeAll(async () => {
    redisClient = createClient({ url: REDIS_URL });
    await redisClient.connect();
    // Initializes the actual singleton sshConnectionRegistry.ts imports --
    // that file has no way to accept an injected instance, unlike the
    // REST-route test helpers elsewhere in this codebase.
    await SBCredentialsDB.init(redisClient as any, `ssh-credential-usage-test-${Date.now()}`, 'ssh-credential-usage-test-key');
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(() => {
    fakeClients = [];
    registry = new SSHConnectionRegistry();
  });

  function connectAndEmitReady(appId: string, params: any) {
    const connectPromise = registry.connect(appId, params);
    const client = fakeClients[fakeClients.length - 1];
    client.emit('ready');
    return connectPromise;
  }

  it('decrypts a real, previously-stored credential and hands its real values to ssh2', async () => {
    const created = await SBCredentialsDB.createOrUpdate('ssh-usage-owner-1', 'sshPrivateKey', 'real-key', {
      type: 'sshPrivateKey',
      username: 'deploy-user',
      privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nreal-key-data\n-----END OPENSSH PRIVATE KEY-----',
      passphrase: 'real-passphrase',
    });

    const result = await connectAndEmitReady('app-real-1', {
      host: 'example.com',
      port: 22,
      ownerId: 'ssh-usage-owner-1',
      credentialId: created.id,
    });

    expect(result).toEqual({ success: true, credentialId: created.id });
    expect(fakeClients[0].connectConfig).toMatchObject({
      host: 'example.com',
      port: 22,
      username: 'deploy-user',
      privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nreal-key-data\n-----END OPENSSH PRIVATE KEY-----',
      passphrase: 'real-passphrase',
    });
  });

  it('refuses a real credential belonging to a different owner, exactly as the REST layer would 404 it', async () => {
    const created = await SBCredentialsDB.createOrUpdate('ssh-usage-owner-2', 'sshPrivateKey', 'someone-elses-key', {
      type: 'sshPrivateKey',
      username: 'u',
      privateKey: 'k',
    });

    const result = await registry.connect('app-real-2', {
      host: 'example.com',
      port: 22,
      ownerId: 'ssh-usage-attacker',
      credentialId: created.id,
    });

    expect(result).toEqual({ success: false, error: 'credential_unavailable' });
    // The registry creates its ssh2.Client (and wires listeners) before
    // resolving the credential, so the client object exists regardless --
    // what actually matters is that connect() was never called on it with
    // the other owner's credential, which the rejected lookup prevents.
    expect(fakeClients[0].connectConfig).toBeUndefined();
  });

  it('persists a brand-new credential to real Redis, readable back independently, and connects with its real values', async () => {
    const result = await connectAndEmitReady('app-real-3', {
      host: 'example.com',
      port: 22,
      ownerId: 'ssh-usage-owner-3',
      newCredential: {
        name: 'freshly-created',
        value: { type: 'sshPrivateKey', username: 'fresh-user', privateKey: 'fresh-key-data' },
      },
    });

    expect(result.success).toBe(true);
    expect(fakeClients[0].connectConfig).toMatchObject({ username: 'fresh-user', privateKey: 'fresh-key-data' });

    // Independently re-read it -- not the same value the registry already
    // had in hand -- to confirm it was actually written to Redis, not just
    // held in memory for this one connection attempt.
    const persisted = await SBCredentialsDB.getDecryptedValue((result as { credentialId: string }).credentialId, 'ssh-usage-owner-3');
    expect(persisted).toEqual({ type: 'sshPrivateKey', username: 'fresh-user', privateKey: 'fresh-key-data' });
  });
});

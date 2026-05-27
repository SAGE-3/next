/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Integration tests for the LocalAuth admin router.
 * Redis (SBAuthDB) and server config are mocked; HTTP is handled by supertest.
 */

import * as express from 'express';
import * as request from 'supertest';

// ── Module mocks (must come before imports that use them) ─────────────────────

jest.mock('@sage3/sagebase', () => ({
  SBAuthDB: {
    createLocalUser: jest.fn(),
    listLocalUsers: jest.fn(),
    getLocalUser: jest.fn(),
    deleteLocalUser: jest.fn(),
  },
  // export other items sagebase normally exports so tsc doesn't complain
  SBAuthDB_placeholder: true,
}));

jest.mock('../../collections', () => ({
  UsersCollection: {
    get: jest.fn(),
  },
}));

jest.mock('../../../config', () => ({
  config: {
    auth: {
      admins: ['admin@example.com'],
    },
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { SBAuthDB } from '@sage3/sagebase';
import { UsersCollection } from '../../collections';
import { LocalAuthRouter } from './localauth';

const mockSBAuthDB = SBAuthDB as jest.Mocked<typeof SBAuthDB>;
const mockUsersCollection = UsersCollection as jest.Mocked<typeof UsersCollection>;

// ── Test helpers ──────────────────────────────────────────────────────────────

/** Build an express app with the router and a fake session user. */
function buildApp(userEmail: string | null) {
  const app = express();
  app.use(express.json());

  // Simulate passport session: inject req.user
  app.use((req: any, _res: any, next: any) => {
    if (userEmail !== null) {
      req.user = { id: 'user-id-123', provider: 'local', providerId: 'test' };
    }
    next();
  });

  // requireAdmin looks up the user email via UsersCollection
  if (userEmail !== null) {
    mockUsersCollection.get.mockResolvedValue({ data: { email: userEmail } } as any);
  }

  app.use('/api/localauth', LocalAuthRouter());
  return app;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LocalAuthRouter — authentication guard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when user is not logged in', async () => {
    const app = buildApp(null);
    const res = await request(app).get('/api/localauth/users');
    expect(res.status).toBe(403);
  });

  it('returns 403 when user is not an admin', async () => {
    const app = buildApp('notadmin@example.com');
    const res = await request(app).get('/api/localauth/users');
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Admin access required');
  });
});

describe('LocalAuthRouter — GET /users', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the list of local users', async () => {
    const app = buildApp('admin@example.com');
    const fakeUsers = [
      { username: 'alice', displayName: 'Alice', email: 'alice@example.com', createdAt: '2026-01-01' },
      { username: 'bob', displayName: 'Bob', email: 'bob@example.com', createdAt: '2026-01-02' },
    ];
    mockSBAuthDB.listLocalUsers.mockResolvedValue(fakeUsers);

    const res = await request(app).get('/api/localauth/users');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].username).toBe('alice');
  });
});

describe('LocalAuthRouter — POST /users', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a user and returns 201 without the password hash', async () => {
    const app = buildApp('admin@example.com');
    mockSBAuthDB.createLocalUser.mockResolvedValue({
      username: 'alice',
      passwordHash: 'SHOULD_NOT_APPEAR',
      displayName: 'Alice',
      email: 'alice@example.com',
      createdAt: '2026-01-01',
    });

    const res = await request(app)
      .post('/api/localauth/users')
      .send({ username: 'alice', password: 'secret123', displayName: 'Alice', email: 'alice@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('alice');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('returns 400 when username is missing', async () => {
    const app = buildApp('admin@example.com');
    const res = await request(app).post('/api/localauth/users').send({ password: 'secret' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const app = buildApp('admin@example.com');
    const res = await request(app).post('/api/localauth/users').send({ username: 'alice' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid username characters', async () => {
    const app = buildApp('admin@example.com');
    const res = await request(app)
      .post('/api/localauth/users')
      .send({ username: 'alice!@#', password: 'secret' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('username may only contain');
  });

  it('returns 409 when username already exists', async () => {
    const app = buildApp('admin@example.com');
    mockSBAuthDB.createLocalUser.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/localauth/users')
      .send({ username: 'alice', password: 'secret' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already exists');
  });
});

describe('LocalAuthRouter — DELETE /users/:username', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes an existing user and returns 200', async () => {
    const app = buildApp('admin@example.com');
    mockSBAuthDB.getLocalUser.mockResolvedValue({
      username: 'alice',
      passwordHash: 'hash',
      displayName: 'Alice',
      email: '',
      createdAt: '2026-01-01',
    });
    mockSBAuthDB.deleteLocalUser.mockResolvedValue(true);

    const res = await request(app).delete('/api/localauth/users/alice');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSBAuthDB.deleteLocalUser).toHaveBeenCalledWith('alice');
  });

  it('returns 404 when user does not exist', async () => {
    const app = buildApp('admin@example.com');
    mockSBAuthDB.getLocalUser.mockResolvedValue(undefined);

    const res = await request(app).delete('/api/localauth/users/nobody');

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('not found');
  });
});

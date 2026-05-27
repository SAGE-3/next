/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as bcrypt from 'bcrypt';

// Mock the SBAuthDatabase module before importing LocalAdapter
jest.mock('../SBAuthDatabase', () => ({
  SBAuthDB: {
    getLocalUser: jest.fn(),
    findOrAddAuth: jest.fn(),
  },
}));

// Mock passport to capture the registered strategy
jest.mock('passport', () => {
  const strategies: Record<string, any> = {};
  return {
    use: jest.fn((name: string, strategy: any) => {
      if (typeof name === 'object') {
        // passport.use(strategy) — name is the strategy
        strategies['local'] = name;
      } else {
        strategies[name] = strategy;
      }
    }),
    _strategies: strategies,
  };
});

import { SBAuthDB } from '../SBAuthDatabase';
import { passportLocalSetup } from './LocalAdapter';
import * as passport from 'passport';

const mockSBAuthDB = SBAuthDB as jest.Mocked<typeof SBAuthDB>;

/**
 * Extract the verify callback registered with passport-local by
 * calling passportLocalSetup() and intercepting passport.use().
 */
function getVerifyCallback(): (
  username: string,
  password: string,
  done: (err: unknown, user?: Express.User | false, info?: { message: string }) => void
) => Promise<void> {
  let capturedVerify: any;
  const mockPassportUse = passport.use as jest.Mock;
  mockPassportUse.mockImplementationOnce((_strategy: any) => {
    capturedVerify = _strategy._verify;
  });

  passportLocalSetup();
  return capturedVerify;
}

describe('passportLocalSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true on successful setup', () => {
    (passport.use as jest.Mock).mockImplementationOnce(() => {});
    expect(passportLocalSetup()).toBe(true);
  });
});

describe('LocalStrategy verify callback', () => {
  const VALID_PASSWORD = 'correct-password';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(VALID_PASSWORD, 10);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function buildDone() {
    return jest.fn() as jest.MockedFunction<
      (err: unknown, user?: Express.User | false, info?: { message: string }) => void
    >;
  }

  async function runVerify(username: string, password: string) {
    const done = buildDone();
    let capturedVerify: any;

    (passport.use as jest.Mock).mockImplementationOnce((strategy: any) => {
      capturedVerify = strategy._verify;
    });
    passportLocalSetup();

    await capturedVerify(username, password, done);
    return done;
  }

  it('calls done with false when user does not exist', async () => {
    mockSBAuthDB.getLocalUser.mockResolvedValue(undefined);

    const done = await runVerify('unknown', 'anypassword');

    expect(done).toHaveBeenCalledWith(null, false, { message: 'Invalid username or password' });
  });

  it('calls done with false when password is wrong', async () => {
    mockSBAuthDB.getLocalUser.mockResolvedValue({
      username: 'alice',
      passwordHash,
      displayName: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date().toISOString(),
    });

    const done = await runVerify('alice', 'wrong-password');

    expect(done).toHaveBeenCalledWith(null, false, { message: 'Invalid username or password' });
  });

  it('calls done with auth record on valid credentials', async () => {
    const fakeAuthRecord = {
      id: 'uuid-123',
      provider: 'local',
      providerId: 'alice',
      displayName: 'Alice',
      email: 'alice@example.com',
      picture: '',
      password: '',
    };

    mockSBAuthDB.getLocalUser.mockResolvedValue({
      username: 'alice',
      passwordHash,
      displayName: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date().toISOString(),
    });
    mockSBAuthDB.findOrAddAuth.mockResolvedValue(fakeAuthRecord);

    const done = await runVerify('alice', VALID_PASSWORD);

    expect(done).toHaveBeenCalledWith(null, fakeAuthRecord);
  });

  it('calls done with false when findOrAddAuth returns undefined', async () => {
    mockSBAuthDB.getLocalUser.mockResolvedValue({
      username: 'alice',
      passwordHash,
      displayName: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date().toISOString(),
    });
    mockSBAuthDB.findOrAddAuth.mockResolvedValue(undefined);

    const done = await runVerify('alice', VALID_PASSWORD);

    expect(done).toHaveBeenCalledWith(null, false, { message: 'Authentication failed' });
  });

  it('calls done with error when an exception is thrown', async () => {
    const error = new Error('Redis connection failed');
    mockSBAuthDB.getLocalUser.mockRejectedValue(error);

    const done = await runVerify('alice', VALID_PASSWORD);

    expect(done).toHaveBeenCalledWith(error);
  });
});

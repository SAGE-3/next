/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Tests for the iOS app's web-login handoff (SBMobileLogin): the start route keeps the
 * app's challenge, the callback's one-time code, and POST /auth/mobile/exchange.
 */

import { randomBytes } from 'crypto';
import express from 'express';
import supertest from 'supertest';

import {
  issueMobileCode,
  makeMobileExchangeHandler,
  mobileChallengeOf,
  MobileCodeStore,
  rememberMobileLogin,
  takeMobileChallenge,
} from './SBMobileLogin';

const PREFIX = 'TEST:AUTH';
const user = { id: 'auth-1', provider: 'google', providerId: 'g-123' } as unknown as Express.User;

/** An in-memory Redis double; expiry is not simulated */
function memoryStore(): MobileCodeStore & { data: Map<string, string>; ttls: Map<string, number> } {
  const data = new Map<string, string>();
  const ttls = new Map<string, number>();
  return {
    data,
    ttls,
    async set(key, value, options) {
      data.set(key, value);
      ttls.set(key, options.EX);
    },
    async getDel(key) {
      const value = data.get(key) ?? null;
      data.delete(key);
      return value;
    },
  };
}

/** An app with the exchange route; req.logIn is stubbed to record the logged-in account */
function exchangeApp(store: MobileCodeStore) {
  const logins: unknown[] = [];
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).logIn = (u: unknown, done: (err?: Error) => void) => {
      logins.push(u);
      done();
    };
    next();
  });
  app.post('/auth/mobile/exchange', makeMobileExchangeHandler(store, PREFIX));
  return { app, logins };
}

const newVerifier = () => randomBytes(32).toString('base64url');

describe('rememberMobileLogin / takeMobileChallenge', () => {
  const run = (session: any, query: any) => {
    const next = jest.fn();
    rememberMobileLogin({ session, query } as any, {} as any, next);
    expect(next).toHaveBeenCalled();
    return session;
  };

  it("keeps the app's challenge in the session, and hands it over once", () => {
    const challenge = mobileChallengeOf(newVerifier());
    const session = run({}, { mobile: challenge });
    expect(takeMobileChallenge({ session } as any)).toBe(challenge);
    expect(takeMobileChallenge({ session } as any)).toBeUndefined();
  });

  it('forgets an earlier challenge when a web login starts (no ?mobile)', () => {
    const session = run({ mobileChallenge: mobileChallengeOf(newVerifier()) }, {});
    expect(takeMobileChallenge({ session } as any)).toBeUndefined();
  });

  it('ignores a malformed challenge', () => {
    for (const mobile of ['short', 'x'.repeat(44), 'has spaces and symbols!!!!!!!!!!!!!!!!!!!!!!', ['a', 'b']]) {
      const session = run({}, { mobile });
      expect(takeMobileChallenge({ session } as any)).toBeUndefined();
    }
  });

  it('does nothing without a session', () => {
    expect(() => run(undefined, { mobile: mobileChallengeOf(newVerifier()) })).not.toThrow();
    expect(takeMobileChallenge({} as any)).toBeUndefined();
  });
});

describe('issueMobileCode', () => {
  it('stores the account and the challenge under a random code, for 60 seconds', async () => {
    const store = memoryStore();
    const challenge = mobileChallengeOf(newVerifier());
    const code = await issueMobileCode(store, PREFIX, user, challenge);
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.parse(store.data.get(`${PREFIX}:MOBILE:${code}`)!)).toEqual({ user, challenge });
    expect(store.ttls.get(`${PREFIX}:MOBILE:${code}`)).toBe(60);
    expect(await issueMobileCode(store, PREFIX, user, challenge)).not.toBe(code);
  });
});

describe('POST /auth/mobile/exchange', () => {
  it('logs the app in with the right verifier, once', async () => {
    const store = memoryStore();
    const verifier = newVerifier();
    const code = await issueMobileCode(store, PREFIX, user, mobileChallengeOf(verifier));
    const { app, logins } = exchangeApp(store);

    const first = await supertest(app).post('/auth/mobile/exchange').send({ code, verifier });
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ success: true });
    expect(logins).toEqual([user]);

    // The code is used up
    const again = await supertest(app).post('/auth/mobile/exchange').send({ code, verifier });
    expect(again.status).toBe(401);
    expect(logins).toHaveLength(1);
  });

  it('refuses a wrong verifier, and the code is then used up', async () => {
    const store = memoryStore();
    const verifier = newVerifier();
    const code = await issueMobileCode(store, PREFIX, user, mobileChallengeOf(verifier));
    const { app, logins } = exchangeApp(store);

    const wrong = await supertest(app).post('/auth/mobile/exchange').send({ code, verifier: newVerifier() });
    expect(wrong.status).toBe(401);
    // An intercepted code can't be retried with guesses
    const right = await supertest(app).post('/auth/mobile/exchange').send({ code, verifier });
    expect(right.status).toBe(401);
    expect(logins).toHaveLength(0);
  });

  it('refuses an unknown code', async () => {
    const { app, logins } = exchangeApp(memoryStore());
    const res = await supertest(app)
      .post('/auth/mobile/exchange')
      .send({ code: randomBytes(32).toString('base64url'), verifier: newVerifier() });
    expect(res.status).toBe(401);
    expect(logins).toHaveLength(0);
  });

  it('refuses malformed requests without reading the store', async () => {
    const store = memoryStore();
    const getDel = jest.spyOn(store, 'getDel');
    const { app } = exchangeApp(store);
    const code = randomBytes(32).toString('base64url');
    for (const body of [
      {},
      { code },
      { verifier: newVerifier() },
      { code: 'short', verifier: newVerifier() },
      { code, verifier: 'short' },
      { code: 1, verifier: 2 },
    ]) {
      const res = await supertest(app).post('/auth/mobile/exchange').send(body);
      expect(res.status).toBe(400);
    }
    expect(getDel).not.toHaveBeenCalled();
  });

  it('answers 500 when the store fails', async () => {
    const store = memoryStore();
    store.getDel = async () => {
      throw new Error('redis down');
    };
    const { app, logins } = exchangeApp(store);
    const res = await supertest(app)
      .post('/auth/mobile/exchange')
      .send({ code: randomBytes(32).toString('base64url'), verifier: newVerifier() });
    expect(res.status).toBe(500);
    expect(logins).toHaveLength(0);
  });
});

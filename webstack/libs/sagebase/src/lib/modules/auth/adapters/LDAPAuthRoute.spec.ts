/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Regression tests for the POST /auth/ldap route handler.
 *
 * Root cause this locks in: ldapauth-fork can emit a late connection 'error'
 * that re-invokes the passport callback AFTER we've already sent a response.
 * Without the `if (res.headersSent) return;` guards, the second invocation
 * calls res.redirect() a second time and throws
 * "Cannot set headers after they are sent to the client" — which previously
 * crashed login and made the login UI disappear.
 *
 * The first response has already reached the client by then, so the HTTP
 * status is unchanged; the bug only shows up as a SECOND send attempt. We
 * therefore count calls to res.redirect and assert exactly one. We import the
 * REAL handler factory from SBAuth, so removing either guard breaks these
 * tests.
 */

// SBAuth pulls in SBAuthDatabase (redis); stub it so importing the module is cheap.
jest.mock('../SBAuthDatabase', () => ({
  SBAuthDatabase: class {},
  SBAuthDB: {},
}));

import * as express from 'express';
import * as supertest from 'supertest';

import { makeLdapAuthHandler } from '../SBAuth';

/**
 * A passport double whose `authenticate` returns a middleware that invokes the
 * verify callback twice: first the "primary" outcome, then a late error that
 * simulates ldapauth-fork's delayed connection teardown re-firing the callback.
 */
function doubleFiringPassport(primary: { err: Error | null; user: any }) {
  return {
    authenticate(_strategy: string, callback: (err: Error | null, user: any) => void) {
      return (_req: express.Request, _res: express.Response, _next: express.NextFunction) => {
        callback(primary.err, primary.user);
        // Late connection error re-invokes the same callback after we responded.
        callback(new Error('late ldapauth-fork connection error'), false);
      };
    },
  };
}

/** Builds an app whose res.redirect calls are recorded, so we can detect double-sends. */
function buildApp(passportDouble: any) {
  const redirects: string[] = [];
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    // passport.initialize() would normally add req.logIn; stub it to succeed
    // immediately so we exercise the success branch of the handler.
    (req as any).logIn = (_user: any, cb: (err: Error | null) => void) => cb(null);
    // Record every redirect attempt, then call through to real behaviour
    // (a second call after headersSent throws, exactly as in production).
    const orig = res.redirect.bind(res);
    (res as any).redirect = (target: string) => {
      redirects.push(target);
      return (orig as any)(target);
    };
    next();
  });
  app.post('/auth/ldap', makeLdapAuthHandler(passportDouble));
  return { app, redirects };
}

/** POST to /auth/ldap, tolerating a server-side throw from a double-send. */
async function post(app: express.Application) {
  try {
    return await supertest(app).post('/auth/ldap').type('form').send({ username: 'u', password: 'p' });
  } catch {
    return null;
  }
}

describe('makeLdapAuthHandler — double-send guard regression', () => {
  it('redirects to / exactly once on success despite a late callback', async () => {
    const { app, redirects } = buildApp(doubleFiringPassport({ err: null, user: { id: 'alice' } }));
    const res = await post(app);
    // Guard intact → res.redirect called once. Without it → called twice (2nd throws).
    expect(redirects).toEqual(['/']);
    expect(res?.status).toBe(302);
  });

  it('redirects to ldap_failed exactly once on auth failure despite a late callback', async () => {
    const { app, redirects } = buildApp(doubleFiringPassport({ err: null, user: false }));
    const res = await post(app);
    expect(redirects).toEqual(['/?error=ldap_failed']);
    expect(res?.status).toBe(302);
  });

  it('redirects exactly once when the primary outcome is itself an error', async () => {
    const { app, redirects } = buildApp(doubleFiringPassport({ err: new Error('initial bind error'), user: false }));
    await post(app);
    expect(redirects).toEqual(['/?error=ldap_failed']);
  });
});

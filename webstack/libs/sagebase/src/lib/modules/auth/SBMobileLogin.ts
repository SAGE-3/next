/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Web logins (Google, ...) for the native iOS app.
 *
 * The app runs the usual web login in the system's login sheet, whose cookies it can't
 * read. So the login hands the app a one-time code instead of a cookie:
 *   1. The app opens /auth/google?mobile=<challenge>, where challenge is the base64url
 *      SHA-256 of a random verifier only the app knows (PKCE, RFC 7636).
 *   2. The start route keeps the challenge in the login's session (rememberMobileLogin).
 *   3. After a successful login the callback redirects to sage3://auth?code=<code>
 *      instead of '/': a random code, valid 60 s, stored with the account and the
 *      challenge (issueMobileCode).
 *   4. The app posts { code, verifier } to /auth/mobile/exchange, which checks the
 *      verifier against the challenge, uses up the code, and logs the app in, setting a
 *      normal session cookie (makeMobileExchangeHandler).
 * A web login without ?mobile works exactly as before.
 *
 * Apple's callback is a cross-site form POST, which the session cookie (sameSite lax)
 * doesn't come with: there the challenge goes to Apple and back in the OAuth state
 * instead (mobileLoginState, mobileChallengeFromState).
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';
// Declare req.session, Express.User and req.logIn
import 'express-session';
import 'passport';

/** Where the login sheet returns to: the only redirect target, never taken from the request */
export const MOBILE_LOGIN_REDIRECT = 'sage3://auth';
/** Life of a one-time code, in seconds */
const CODE_TTL = 60;
/** A challenge (base64url SHA-256) or a code (32 random bytes, base64url): 43 characters */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
/** A PKCE verifier: 43 to 128 characters (RFC 7636) */
const VERIFIER = /^[A-Za-z0-9_-]{43,128}$/;

/** The part of the Redis client used here */
export type MobileCodeStore = {
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  getDel(key: string): Promise<string | null>;
};

type MobileSession = { mobileChallenge?: string };

/** The PKCE challenge of a verifier: base64url of its SHA-256 */
export function mobileChallengeOf(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Middleware for a login's start route: remember the app's challenge in the session, so
 * the callback knows to hand the login to the app. Without one (a web login), forget any
 * earlier one.
 */
export function rememberMobileLogin(req: Request, _res: Response, next: NextFunction) {
  const session = req.session as unknown as MobileSession | undefined;
  const challenge = req.query['mobile'];
  if (session) {
    if (typeof challenge === 'string' && TOKEN.test(challenge)) session.mobileChallenge = challenge;
    else delete session.mobileChallenge;
  }
  next();
}

/**
 * The app's challenge for this login, if the app started it; removed from the session.
 * Read it before req.logIn, which replaces the session.
 */
export function takeMobileChallenge(req: Request): string | undefined {
  const session = req.session as unknown as MobileSession | undefined;
  const challenge = session?.mobileChallenge;
  if (session && challenge) delete session.mobileChallenge;
  return challenge;
}

/** OAuth state carrying the app's challenge: 'mobile.<challenge>' */
const STATE_PREFIX = 'mobile.';

/**
 * For a login whose callback comes back without the session (Apple): the OAuth state to
 * send, carrying the app's challenge; undefined for a web login (the strategy's own state)
 */
export function mobileLoginState(req: Request): string | undefined {
  const challenge = req.query['mobile'];
  return typeof challenge === 'string' && TOKEN.test(challenge) ? STATE_PREFIX + challenge : undefined;
}

/** The app's challenge from the callback's OAuth state (form POST or query), if the app started it */
export function mobileChallengeFromState(req: Request): string | undefined {
  const state = req.body?.state ?? req.query['state'];
  if (typeof state !== 'string' || !state.startsWith(STATE_PREFIX)) return undefined;
  const challenge = state.slice(STATE_PREFIX.length);
  return TOKEN.test(challenge) ? challenge : undefined;
}

/** Store a one-time code for the logged-in account; returns the code */
export async function issueMobileCode(store: MobileCodeStore, prefix: string, user: Express.User, challenge: string): Promise<string> {
  const code = randomBytes(32).toString('base64url');
  await store.set(`${prefix}:MOBILE:${code}`, JSON.stringify({ user, challenge }), { EX: CODE_TTL });
  return code;
}

/** Route handler for POST /auth/mobile/exchange { code, verifier } */
export function makeMobileExchangeHandler(store: MobileCodeStore, prefix: string) {
  return async (req: Request, res: Response) => {
    const { code, verifier } = req.body ?? {};
    if (typeof code !== 'string' || !TOKEN.test(code) || typeof verifier !== 'string' || !VERIFIER.test(verifier)) {
      return res.status(400).send({ success: false, message: 'Invalid request' });
    }
    // Get and delete in one step: a code works once
    let stored: string | null;
    try {
      stored = await store.getDel(`${prefix}:MOBILE:${code}`);
    } catch {
      return res.status(500).send({ success: false, message: 'Login failed' });
    }
    if (!stored) return res.status(401).send({ success: false, message: 'Invalid or expired code' });
    const { user, challenge } = JSON.parse(stored) as { user: Express.User; challenge: string };
    const expected = Buffer.from(challenge);
    const actual = Buffer.from(mobileChallengeOf(verifier));
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return res.status(401).send({ success: false, message: 'Invalid or expired code' });
    }
    return req.logIn(user, (err) => {
      if (err) return res.status(500).send({ success: false, message: 'Login failed' });
      return res.send({ success: true });
    });
  };
}

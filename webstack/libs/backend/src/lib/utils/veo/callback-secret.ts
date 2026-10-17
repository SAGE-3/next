/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { createHmac, timingSafeEqual } from 'crypto';

// Prefix so the key only ever signs VEO callback uids, never anything else
const CALLBACK_SECRET_CONTEXT = 'veo-callback:v1:';

/**
 * The callback secret for one VEO uid (a SAGE3 app id).
 * The server hands it to VEO as X-Callback-Secret on launch, and VEO presents it as
 * a Bearer token on every callback it relays back. Derived, not stored: a leaked
 * secret only works for that one app, and changing the key revokes them all.
 * @param key The VEO callback key (VEO_CALLBACK_KEY)
 * @param uid The VEO uid
 * @returns The hex HMAC-SHA256 of the uid
 */
export function veoCallbackSecret(key: string, uid: string): string {
  return createHmac('sha256', key)
    .update(CALLBACK_SECRET_CONTEXT + uid)
    .digest('hex');
}

/**
 * Check the Authorization header of a VEO callback against the uid's secret, in constant time.
 * @param key The VEO callback key; empty means callbacks are disabled and nothing verifies
 * @param uid The uid the callback is for
 * @param authHeader The request's Authorization header
 */
export function verifyVeoCallbackSecret(key: string, uid: string, authHeader?: string): boolean {
  if (!key || !authHeader || !authHeader.startsWith('Bearer ')) return false;
  const expected = Buffer.from(veoCallbackSecret(key, uid));
  const received = Buffer.from(authHeader.slice('Bearer '.length));
  return received.length === expected.length && timingSafeEqual(received, expected);
}

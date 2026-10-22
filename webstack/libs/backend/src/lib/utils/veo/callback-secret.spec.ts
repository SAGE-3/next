/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { veoCallbackSecret, verifyVeoCallbackSecret } from './callback-secret';

const KEY = 'a-test-callback-key';
const UID = 'app-1';

describe('veoCallbackSecret', () => {
  it('is stable for a key and uid', () => {
    expect(veoCallbackSecret(KEY, UID)).toBe(veoCallbackSecret(KEY, UID));
    expect(veoCallbackSecret(KEY, UID)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs per uid and per key', () => {
    expect(veoCallbackSecret(KEY, UID)).not.toBe(veoCallbackSecret(KEY, 'app-2'));
    expect(veoCallbackSecret(KEY, UID)).not.toBe(veoCallbackSecret('another-key', UID));
  });
});

describe('verifyVeoCallbackSecret', () => {
  const header = `Bearer ${veoCallbackSecret(KEY, UID)}`;

  it('accepts the uid own secret', () => {
    expect(verifyVeoCallbackSecret(KEY, UID, header)).toBe(true);
  });

  it('rejects another uid secret', () => {
    expect(verifyVeoCallbackSecret(KEY, 'app-2', header)).toBe(false);
  });

  it('rejects a missing, malformed or wrong header', () => {
    expect(verifyVeoCallbackSecret(KEY, UID)).toBe(false);
    expect(verifyVeoCallbackSecret(KEY, UID, veoCallbackSecret(KEY, UID))).toBe(false);
    expect(verifyVeoCallbackSecret(KEY, UID, 'Bearer short')).toBe(false);
    expect(verifyVeoCallbackSecret(KEY, UID, `Bearer ${veoCallbackSecret('another-key', UID)}`)).toBe(false);
  });

  it('rejects everything when no key is configured', () => {
    expect(verifyVeoCallbackSecret('', UID, `Bearer ${veoCallbackSecret('', UID)}`)).toBe(false);
  });
});

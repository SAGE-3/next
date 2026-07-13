/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { checkPermissionsWS } from './permissions';
import { SBAuthSchema } from '@sage3/sagebase';

function auth(overrides: Partial<SBAuthSchema>): SBAuthSchema {
  return { provider: 'google', providerId: 'google-id', id: 'auth-1', ...overrides };
}

describe('checkPermissionsWS — provider-to-role mapping', () => {
  it('a google-authenticated user (mapped to "user") can create apps', () => {
    expect(checkPermissionsWS(auth({ provider: 'google' }), 'POST', 'APPS')).toBe(true);
  });

  it('an admin-mapped provider can create apps', () => {
    expect(checkPermissionsWS(auth({ provider: 'admin' }), 'POST', 'APPS')).toBe(true);
  });

  it('a spectator-mapped provider cannot create apps but can read them', () => {
    expect(checkPermissionsWS(auth({ provider: 'spectator' }), 'POST', 'APPS')).toBe(false);
    expect(checkPermissionsWS(auth({ provider: 'spectator' }), 'GET', 'APPS')).toBe(true);
  });

  it('a guest-mapped provider cannot delete apps', () => {
    expect(checkPermissionsWS(auth({ provider: 'guest' }), 'DELETE', 'APPS')).toBe(false);
  });

  it('an unrecognized provider is denied entirely', () => {
    expect(checkPermissionsWS(auth({ provider: 'nonexistent-provider' }), 'GET', 'APPS')).toBe(false);
  });

  it('maps every HTTP-style action correctly (POST/GET/PUT/DELETE/SUB/UNSUB)', () => {
    const a = auth({ provider: 'admin' });
    expect(checkPermissionsWS(a, 'POST', 'APPS')).toBe(true);
    expect(checkPermissionsWS(a, 'GET', 'APPS')).toBe(true);
    expect(checkPermissionsWS(a, 'PUT', 'APPS')).toBe(true);
    expect(checkPermissionsWS(a, 'DELETE', 'APPS')).toBe(true);
    expect(checkPermissionsWS(a, 'SUB', 'APPS')).toBe(true);
    expect(checkPermissionsWS(a, 'UNSUB', 'APPS')).toBe(true);
  });
});

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

describe('checkPermissionsWS — LDAP role resolution', () => {
  // Coverage for the reason convertProviderToRole takes the whole auth
  // record now, not just the provider string: LDAPAdapter.resolveRole()
  // computes admin/user/spectator from LDAP group membership and persists
  // it as auth.role — without this, every LDAP login was granted the
  // coarse, hardcoded 'user' role regardless of which group it matched.

  it('an LDAP user with a persisted admin role can create apps', () => {
    expect(checkPermissionsWS(auth({ provider: 'ldap', role: 'admin' }), 'POST', 'APPS')).toBe(true);
  });

  it('an LDAP user with a persisted spectator role cannot create apps', () => {
    expect(checkPermissionsWS(auth({ provider: 'ldap', role: 'spectator' }), 'POST', 'APPS')).toBe(false);
  });

  it('an LDAP user with a persisted spectator role can still read apps', () => {
    expect(checkPermissionsWS(auth({ provider: 'ldap', role: 'spectator' }), 'GET', 'APPS')).toBe(true);
  });

  it('an LDAP auth record with no persisted role falls back to the coarse provider map (user)', () => {
    // Non-group-mapped LDAP logins, or records created before this feature.
    expect(checkPermissionsWS(auth({ provider: 'ldap', role: undefined }), 'POST', 'APPS')).toBe(true);
  });

  it('a non-LDAP provider is unaffected even if a role field were somehow present', () => {
    // Defense in depth: only providers in PROVIDERS_WITH_DYNAMIC_ROLE have
    // their persisted role trusted at all. Google never legitimately sets
    // extras.role — only LDAPAdapter does — so this models a malformed or
    // forged record rather than a real code path. Using 'spectator' here
    // (not 'admin') so the assertion actually distinguishes "role ignored,
    // falls back to google's real 'user' mapping" (create allowed) from
    // "role trusted" (create would be denied) — 'admin' vs 'user' behave
    // identically for this action and wouldn't prove anything.
    expect(checkPermissionsWS(auth({ provider: 'google', role: 'spectator' }), 'POST', 'APPS')).toBe(true);
  });

  it('a guest auth record is never elevated even if a role field were somehow present', () => {
    expect(checkPermissionsWS(auth({ provider: 'guest', role: 'admin' }), 'DELETE', 'APPS')).toBe(false);
  });
});

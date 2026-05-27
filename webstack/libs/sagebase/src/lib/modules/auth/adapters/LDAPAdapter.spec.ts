/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { resolveRole } from './LDAPAdapter';

const groupMapping = {
  admin: 'CN=SAGE3-Admins,OU=Groups,DC=example,DC=com',
  user: 'CN=SAGE3-Users,OU=Groups,DC=example,DC=com',
  spectator: 'CN=SAGE3-Spectators,OU=Groups,DC=example,DC=com',
};

describe('resolveRole', () => {
  it('returns defaultRole when memberOf is empty', () => {
    expect(resolveRole([], groupMapping, 'viewer')).toBe('viewer');
  });

  it('returns defaultRole when no group matches', () => {
    const memberOf = ['CN=OtherGroup,OU=Groups,DC=example,DC=com'];
    expect(resolveRole(memberOf, groupMapping, 'viewer')).toBe('viewer');
  });

  it('returns admin when user is in the admin group', () => {
    const memberOf = [groupMapping.admin];
    expect(resolveRole(memberOf, groupMapping, 'viewer')).toBe('admin');
  });

  it('returns user when user is in the user group', () => {
    const memberOf = [groupMapping.user];
    expect(resolveRole(memberOf, groupMapping, 'viewer')).toBe('user');
  });

  it('returns spectator when user is in the spectator group', () => {
    const memberOf = [groupMapping.spectator];
    expect(resolveRole(memberOf, groupMapping, 'viewer')).toBe('spectator');
  });

  it('prefers admin over user when user is in both groups', () => {
    const memberOf = [groupMapping.user, groupMapping.admin];
    expect(resolveRole(memberOf, groupMapping, 'viewer')).toBe('admin');
  });

  it('prefers admin over spectator when user is in both groups', () => {
    const memberOf = [groupMapping.spectator, groupMapping.admin];
    expect(resolveRole(memberOf, groupMapping, 'viewer')).toBe('admin');
  });

  it('prefers user over spectator when user is in both groups', () => {
    const memberOf = [groupMapping.spectator, groupMapping.user];
    expect(resolveRole(memberOf, groupMapping, 'viewer')).toBe('user');
  });

  it('is case-insensitive for group DN matching', () => {
    const memberOf = [groupMapping.admin.toUpperCase()];
    expect(resolveRole(memberOf, groupMapping, 'viewer')).toBe('admin');
  });

  it('handles partial group mapping (only admin defined)', () => {
    const partialMapping = { admin: groupMapping.admin };
    const memberOf = [groupMapping.user];
    expect(resolveRole(memberOf, partialMapping, 'viewer')).toBe('viewer');
  });

  it('handles empty group mapping', () => {
    const memberOf = [groupMapping.admin];
    expect(resolveRole(memberOf, {}, 'viewer')).toBe('viewer');
  });
});

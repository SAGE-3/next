/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SAGE3Ability, ActionArg, ResourceArg } from './SAGEAbility';

const ALL_ACTIONS: ActionArg[] = [
  'create',
  'read',
  'update',
  'delete',
  'upload',
  'download',
  'resize',
  'move',
  'lasso',
  'execute',
  'sub',
  'unsub',
  'join',
  'pin',
  'lock',
];

const ALL_RESOURCES: ResourceArg[] = [
  'assets',
  'apps',
  'boards',
  'message',
  'plugins',
  'presence',
  'rooms',
  'users',
  'kernels',
  'insight',
  'annotations',
  'roommembers',
  'links',
];

describe('SAGE3Ability — guest role', () => {
  it('can create, read, and update apps, presence, and users', () => {
    for (const resource of ['apps', 'presence', 'users'] as ResourceArg[]) {
      expect(SAGE3Ability.can('guest', 'create', resource)).toBe(true);
      expect(SAGE3Ability.can('guest', 'read', resource)).toBe(true);
      expect(SAGE3Ability.can('guest', 'update', resource)).toBe(true);
    }
  });

  it('can resize, move, and lasso apps', () => {
    for (const action of ['resize', 'move', 'lasso'] as ActionArg[]) {
      expect(SAGE3Ability.can('guest', action, 'apps')).toBe(true);
    }
  });

  it('cannot delete anything, on any resource', () => {
    for (const resource of ALL_RESOURCES) {
      expect(SAGE3Ability.can('guest', 'delete', resource)).toBe(false);
    }
  });

  it('can read every resource', () => {
    for (const resource of ALL_RESOURCES) {
      expect(SAGE3Ability.can('guest', 'read', resource)).toBe(true);
    }
  });

  it('can download assets', () => {
    expect(SAGE3Ability.can('guest', 'download', 'assets')).toBe(true);
  });

  it('cannot create or update boards or rooms', () => {
    for (const resource of ['boards', 'rooms'] as ResourceArg[]) {
      expect(SAGE3Ability.can('guest', 'create', resource)).toBe(false);
      expect(SAGE3Ability.can('guest', 'update', resource)).toBe(false);
    }
  });
});

describe('SAGE3Ability — spectator role', () => {
  it('is read-only across every resource', () => {
    for (const resource of ALL_RESOURCES) {
      expect(SAGE3Ability.can('spectator', 'read', resource)).toBe(true);
      expect(SAGE3Ability.can('spectator', 'create', resource)).toBe(false);
      expect(SAGE3Ability.can('spectator', 'update', resource)).toBe(false);
      expect(SAGE3Ability.can('spectator', 'delete', resource)).toBe(false);
    }
  });

  it('can download assets', () => {
    expect(SAGE3Ability.can('spectator', 'download', 'assets')).toBe(true);
  });
});

describe('SAGE3Ability — admin and user roles', () => {
  it('admin can do everything on every resource', () => {
    for (const resource of ALL_RESOURCES) {
      for (const action of ALL_ACTIONS) {
        expect(SAGE3Ability.can('admin', action, resource)).toBe(true);
      }
    }
  });

  it('user can do everything on every resource', () => {
    for (const resource of ALL_RESOURCES) {
      for (const action of ALL_ACTIONS) {
        expect(SAGE3Ability.can('user', action, resource)).toBe(true);
      }
    }
  });
});

describe('SAGE3Ability — can()', () => {
  it('returns false when role is undefined', () => {
    expect(SAGE3Ability.can(undefined, 'read', 'apps')).toBe(false);
  });
});

describe('SAGE3Ability — canCurrentUser()', () => {
  // No test in this file calls setUser(), so the shared singleton's user
  // stays unset here — this must run before any test elsewhere sets one.
  it('returns false when no user has been set', () => {
    expect(SAGE3Ability.canCurrentUser('read', 'apps')).toBe(false);
  });
});

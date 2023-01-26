/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// CASL
import { PureAbility, AbilityBuilder, MatchConditions } from '@casl/ability';
import { UserRole } from '@sage3/shared/types';

export { subject } from '@casl/ability';

// Seems necessary to define when using types
const lambdaMatcher = (matchConditions: MatchConditions) => matchConditions;

// const UserRole = z.enum(['admin', 'user', 'guest']);
// export type UserRole = z.infer<typeof UserRole>;

// Type to add a type for CASL
type Property = { ownerId: string };
// What are the actions: manage is a builtin alias
export type AuthAction = 'manage' | 'resize' | 'delete' | 'create' | 'modify' | 'download' | 'upload';
// What are the subjects: all is a builtin alias
type AuthSubject = 'all' | 'app' | 'asset' | 'board' | 'room' | Property;
type AppAbility = PureAbility<[AuthAction, AuthSubject]>;

/**
 * Define the ability of a user to perform an action on a resource
 * The ability is based on the user's role and on the resource type
 *
 * @param {string} role
 * @param {(string | undefined)} userId
 * @returns
 */
export function defineAbilityFor(role: UserRole, userId: string | undefined) {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility);

  // Limit the guest accounts
  if (role === 'admin') {
    can('manage', 'all');
  } else if (role === 'user') {
    can('manage', ['app', 'asset']);
    can('create', ['room', 'board']);
    can(['delete', 'modify'], ['room', 'board'], (b: Property) => b.ownerId === userId);

    // delete board inside room that I own
    // delete board with users inside
    // cannot('delete', 'board', (b: Property) => b.users.length > 0);
  } else if (role === 'guest') {
    can('create', 'app');
    can(['upload', 'download'], 'asset');
    can(['modify', 'delete', 'resize'], 'app', (sub: Property) => sub.ownerId === userId);
  } else if (role === 'viewer') {
    // sit back and watch
    cannot(['resize', 'delete', 'create', 'modify', 'download', 'upload'], 'all');
  }

  return build({
    // @ts-ignore
    conditionsMatcher: lambdaMatcher,
  });
}

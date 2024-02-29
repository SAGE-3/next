/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { User, UserSchema } from '@sage3/shared/types';

// Actions
export type Action = ActionArg | 'all';
export type ActionArg =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'upload'
  | 'download'
  | 'resize'
  | 'move'
  | 'lasso'
  | 'execute'
  | 'sub'
  | 'unsub'
  | 'join'
  | 'pin'
  | 'lock';

// Roles
export type Role = RoleArg | 'all';
export type RoleArg = UserSchema['userRole'];

// Resources
export type Resource = ResourceArg | 'all';
export type ResourceArg =
  | 'assets'
  | 'apps'
  | 'boards'
  | 'message'
  | 'plugins'
  | 'presence'
  | 'rooms'
  | 'users'
  | 'kernels'
  | 'insight'
  | 'annotations'
  | 'roommembers';

// Abliity
type Ability = { role: Role[]; action: Action[]; resource: Resource[] };

type AbilityConfig = {
  abilites: Ability[];
};

const config: AbilityConfig = {
  abilites: [
    { role: ['admin'], resource: ['all'], action: ['all'] },
    { role: ['user'], resource: ['all'], action: ['all'] },
    { role: ['guest'], resource: ['apps', 'presence', 'users'], action: ['create', 'read', 'update', 'sub', 'unsub'] },
    { role: ['guest'], resource: ['apps'], action: ['resize', 'move', 'lasso'] },
    {
      role: ['guest'],
      resource: ['assets', 'boards', 'message', 'plugins', 'rooms', 'insight', 'roommembers', 'annotations'],
      action: ['read', 'sub', 'unsub'],
    },
    { role: ['guest'], resource: ['assets'], action: ['download'] },
    {
      role: ['spectator'],
      resource: ['assets', 'apps', 'boards', 'message', 'plugins', 'presence', 'rooms', 'users', 'insight', 'annotations'],
      action: ['read', 'sub', 'unsub'],
    },
    { role: ['spectator'], resource: ['assets'], action: ['download'] },
  ],
};

/**
 * SAGE3Ability Class (Singleton)
 * Allows the frontend and backend to check if a ROLE can perform an ACTION on a RESOURCE
 * An ability within SAGE3 is a specific action performed on a resource type
 * (i.e. can ADMINS CREATE BOARDS, can USERS READ APPS, can GUESTS UPDATE PRESENCE...etc)
 * This is not checking if the user is AUTHORIZED to perform an action on a specific resource
 * (i.e. can USERA READ BOARD1, can USERB UPDATE ROOM1, can USERC DELETE APP1...etc)
 * The SAGE3Authorization within homebase (backend) is responsible for that
 * Located: webstack/apps/homebase/src/api/permissions/SAGE3Authorization.ts
 */
class SAGE3AbilityClass {
  private _config: AbilityConfig;
  private _user: User | undefined;
  constructor(config: AbilityConfig) {
    this._config = config;
    this._user = undefined;
  }

  // Set the user. Not required.
  public setUser(user: User): void {
    this._user = user;
  }

  // Check if a user role can perform a specific action ability
  private checkAbility(role: RoleArg, action: ActionArg, resource: ResourceArg, ability: Ability): boolean {
    // Check if the role is allowed
    if (!ability.role.includes('all') && !ability.role.includes(role)) {
      return false;
    }
    // Check if the action is allowed
    if (!ability.action.includes('all') && !ability.action.includes(action)) {
      return false;
    }
    // Check if the resource is allowed
    if (!ability.resource.includes('all') && !ability.resource.includes(resource)) {
      return false;
    }
    return true;
  }

  // Check if the user can perform the action
  public can(role: RoleArg | undefined, action: ActionArg, resource: ResourceArg): boolean {
    if (!role) {
      return false;
    }
    // Filter the abilities for the role, action, and resource
    const abilities = this._config.abilites.filter((ability) => this.checkAbility(role, action, resource, ability));
    // Return true if the user has at least one ability
    return abilities.length > 0;
  }

  // Check if the current user can do something
  public canCurrentUser(action: ActionArg, resource: ResourceArg): boolean {
    if (!this._user) return false;
    return this.can(this._user?.data.userRole, action, resource);
  }
}

export const SAGE3Ability = new SAGE3AbilityClass(config);

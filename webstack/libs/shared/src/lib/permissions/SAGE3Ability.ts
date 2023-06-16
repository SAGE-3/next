/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { UserSchema } from '@sage3/shared/types';

// Actions
export type Action = ActionArg | 'all';
export type ActionArg = 'create' | 'read' | 'update' | 'delete' | 'upload' | 'download';

// Roles
export type Role = RoleArg | 'all';
export type RoleArg = UserSchema['userRole'];

// Resources
export type Resource = ResourceArg | 'all';
export type ResourceArg = 'assets' | 'apps' | 'boards' | 'message' | 'plugin' | 'presence' | 'rooms';

// Abliity
type Ability = { role: Role[]; action: Action[]; resource: Resource[] };

type AbilityConfig = {
  abilites: Ability[];
};

const config: AbilityConfig = {
  abilites: [
    { role: ['admin'], resource: ['all'], action: ['all'] },
    { role: ['user'], resource: ['all'], action: ['all'] },
    { role: ['guest'], resource: ['apps', 'presence'], action: ['create', 'read', 'update'] },
    { role: ['guest'], resource: ['assets', 'boards', 'message', 'plugin', 'rooms'], action: ['read'] },
    { role: ['guest'], resource: ['assets'], action: ['upload', 'download'] },
    { role: ['spectator'], resource: ['assets', 'apps', 'boards', 'message', 'plugin', 'presence', 'rooms'], action: ['read'] },
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
  constructor(config: AbilityConfig) {
    this._config = config;
  }
  // Check if a user role can perform a specific action ability
  private checkAbility(role: RoleArg, action: ActionArg, resource: string, ability: Ability) {
    // Check if the role is allowed
    if (!ability.role.includes('all') && !ability.role.includes(role)) {
      return false;
    }
    // Check if the action is allowed
    if (!ability.action.includes('all') && !ability.action.includes(action)) {
      return false;
    }
    // Check if the resource is allowed
    if (!ability.resource.find((el) => el === resource)) {
      return false;
    }
    return true;
  }

  // Check if the user can perform the action
  public can(role: RoleArg, action: ActionArg, resource: ResourceArg) {
    // Filter the abilities for the role, action, and resource
    const abilities = this._config.abilites.filter((ability) => this.checkAbility(role, action, resource, ability));
    // Return true if the user has at least one ability
    return abilities.length > 0;
  }
}

export const SAGE3Ability = new SAGE3AbilityClass(config);

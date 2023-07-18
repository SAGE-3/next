/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// NPM imports
import * as express from 'express';

// SAGEBase Imports
import { SBAuthSchema } from '@sage3/sagebase';

import { Ability, AbilityBuilder } from '@casl/ability';

export type AuthAction = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'SUB' | 'UNSUB';
export type AuthSubject = 'USERS' | 'ASSETS' | 'APPS' | 'BOARDS' | 'ROOMS' | 'PRESENCE' | 'MESSAGE' | 'PLUGINS';
type AppAbility = Ability<[AuthAction, AuthSubject]>;

type Middleware = (req: express.Request, res: express.Response, next: express.NextFunction) => void;
export type AuthMiddleware = (act: AuthAction, subj: AuthSubject) => Middleware;

/**
 * Middleware to check if the user has permission to access the route.
 *
 * @export
 * @param {...string[]} permittedRoles
 * @returns
 */
export function checkPermissionsREST(subj: AuthSubject): Middleware {
  // return a middleware
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // user is already logged in
    const user = req.user as SBAuthSchema;
    // could get more data from user collection
    // UsersCollection.get(user.id)...
    const act = req.method as AuthAction;
    if (defineAbilityFor(user).can(act, subj)) {
      // role is allowed, so continue on the next middleware
      next();
    } else {
      // user is forbidden
      res.status(403).json({ message: 'Forbidden user' });
    }
  };
}

export function checkPermissionsWS(user: SBAuthSchema, act: AuthAction, subj: AuthSubject): boolean {
  //  Check permissions for ws
  const perm = defineAbilityFor(user).can(act, subj);
  return perm;
}

export function defineAbilityFor(user: SBAuthSchema) {
  const { can, build } = new AbilityBuilder<AppAbility>(Ability);

  // Limit the guest accounts
  if (user.provider === 'guest') {
    can(['GET', 'SUB', 'UNSUB'], ['USERS', 'ASSETS', 'APPS', 'BOARDS', 'ROOMS', 'PRESENCE', 'MESSAGE', 'PLUGINS']);
    // login and update presence
    can(['POST', 'PUT'], ['USERS', 'PRESENCE']);
    // apps
    // can(['POST', 'PUT', 'DELETE'], ['APPS']);
    // modify apps, not create or delete
    can(['PUT'], ['APPS']);
  } else {
    // everybody else can do anything
    can(['GET', 'POST', 'PUT', 'DELETE', 'SUB', 'UNSUB'], ['USERS', 'ASSETS', 'APPS', 'BOARDS', 'ROOMS', 'PRESENCE', 'MESSAGE', 'PLUGINS']);
  }

  return build();
}

//////////////
// import { SAGE3Collection } from '@sage3/backend';
// import { AppsCollection, BoardsCollection, RoomsCollection } from '../collections';

// import { SAGE3Ability, ResourceArg, Action, ActionArg, RoleArg } from '@sage3/shared';

// type Resource = { name: ResourceArg; collection: SAGE3Collection<any> };

// type Rule = { resource: Resource; field: string; condition: '=' | 'includes'; ref_prop?: string };
// type Access = { resource: Resource; action: Action[]; rules: Rule[]; allRules: boolean };

// type PermissionConfig = {
//   resources: Resource[];
//   access: Access[];
// };

// const appResource: Resource = { name: 'app', collection: AppsCollection };
// const boardResource: Resource = { name: 'board', collection: BoardsCollection };
// const roomResource: Resource = { name: 'room', collection: RoomsCollection };

// const Perm: PermissionConfig = {
//   resources: [appResource, boardResource, roomResource],
//   access: [
//     {
//       resource: boardResource,
//       action: ['create'],
//       allRules: false,
//       rules: [
//         { resource: roomResource, field: 'members', condition: 'includes' },
//         { resource: roomResource, field: 'ownerId', condition: '=' },
//       ],
//     },
//     {
//       resource: boardResource,
//       action: ['update'],
//       allRules: true,
//       rules: [{ resource: roomResource, field: 'ownerId', condition: '=' }],
//     },
//   ],
// };

// class SAGEPermission {
//   private _config: PermissionConfig;
//   constructor(config: PermissionConfig) {
//     this._config = config;
//   }

//   // Check if the user is authorized to perform the action on the specified resource
//   // Resource_id is the id of the resource
//   // Check_value is the value to check against
//   public async allowed(role: RoleArg, action: ActionArg, resource: Resource['name'], resource_id: string, check_value: string | number) {
//     // Check if they can first
//     const can = SAGE3Ability.can(role, action, resource);
//     if (!can) {
//       return false;
//     }
//     // Filter the access for the resource
//     const access = this._config.access.filter((acc) => acc.resource.name === resource);
//     // If there are no access rules then allow
//     if (access.length === 0) {
//       return true;
//     }
//     // Check if the user is authorized
//     await Promise.all(
//       access.map(async (acc) => {
//         // Get the rules for the access
//         const rules = acc.rules;
//         // Check if the user is authorized for all the rules
//         const authorized = await Promise.all(
//           rules.map(async (rule) => {
//             // Get the value of the field
//             const doc = await acc.resource.collection.get(resource_id);
//             // If no document then reject
//             if (!doc) {
//               return false;
//             }
//             // Get the value of the field
//             const value = doc.data[rule.field];
//             // If no value then reject
//             if (!value) {
//               return false;
//             }
//             // Check if the value matches the rule
//             if (rule.condition === '=') {
//               return value === check_value;
//             } else if (Array.isArray(value) && rule.condition === 'includes') {
//               return value.includes(check_value);
//             } else {
//               return false;
//             }
//           })
//         );
//         // If the user is authorized for all the rules then allow
//         if (acc.allRules) {
//           return authorized.every((auth) => auth);
//         } else {
//           return authorized.some((auth) => auth);
//         }
//       })
//     );
//   }
// }

// export const SAGEPermissionInstance = new SAGEPermission(Perm);

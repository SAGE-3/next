/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { SAGEBase, SBAuthSchema, SBCollectionRef } from '@sage3/sagebase';
import { APIClientWSMessage } from '@sage3/shared/types';
import { NextFunction, Request, Response } from 'express';
import { WebSocket } from 'ws';

const methodActionMap = {
  POST: 'CREATE',
  GET: 'READ',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
  SUB: 'READ',
  UNSUB: 'READ',
};

type RoomMembersScheme = {
  roomId: string;
  members: [];
};

type AuthorizationConfig = {
  protectedCollections: string[];
};

const config = {
  protectedCollections: ['ROOMS', 'APPS', 'BOARDS'],
};

class SAGEAuthorization {
  private _roomMembersCollection!: SBCollectionRef<RoomMembersScheme>;
  private _config: AuthorizationConfig;
  constructor(config: AuthorizationConfig) {
    this._config = config;
  }

  public async initialize() {
    this._roomMembersCollection = await SAGEBase.Database.collection<RoomMembersScheme>('ROOMMEMBERS', { roomId: '' });
  }

  public async authorizeREST(req: Request, res: Response, next: NextFunction, collection: string) {
    // Check for user
    const auth = req.user as SBAuthSchema;
    const userId = auth?.id;
    if (!userId) this.sendUnauthorized(res);

    // Check if the collection is protected
    const collectionName = collection;
    if (!this._config.protectedCollections.includes(collectionName)) {
      next();
      return;
    }

    // Map the method to an action
    const method = req.method as keyof typeof methodActionMap;
    const action = methodActionMap[method];

    // Check if the user is authorized
    const authorized = await this.authorize(userId, collectionName, action);

    // Respond with an error if not authorized
    if (!authorized) this.sendUnauthorized(res);
    next();
    return;
  }

  public async authorizeWS(socket: WebSocket, message: APIClientWSMessage, user: SBAuthSchema, collection: string): Promise<boolean> {
    // Check for user
    const userId = user.id;
    if (!userId) {
      return false;
    }

    // Check if the collection is protected
    const collectionName = collection;
    if (!this._config.protectedCollections.includes(collectionName)) return true;

    // Map the method to an action
    const action = methodActionMap[message.method];

    // Check if the user is authorized
    const authorized = await this.authorize(userId, collectionName, action);

    // Respond with an error if not authorized
    if (!authorized) return false;
    return true;
  }

  private async authorize(userId: string, collectionName: string, action: string): Promise<boolean> {
    console.log('authorize', { userId, collectionName, action });
    return true;
  }

  private sendUnauthorized(res: Response) {
    res.status(401).send({ success: false, message: 'Unauthorized' });
  }
}

export const SAGEAuth = new SAGEAuthorization(config);

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

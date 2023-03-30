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

import { PureAbility, AbilityBuilder } from '@casl/ability';

export type AuthAction = 'manage' | 'POST' | 'GET' | 'PUT' | 'DELETE' | 'SUB' | 'UNSUB';
export type AuthSubject = 'all' | 'USERS' | 'ASSETS' | 'APPS' | 'BOARDS' | 'ROOMS' | 'PRESENCE' | 'MESSAGE' | 'PLUGINS';
type AppAbility = PureAbility<[AuthAction, AuthSubject]>;

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
  const { can, build } = new AbilityBuilder<AppAbility>(PureAbility);

  // // Limit the guest accounts
  // if (user.provider === 'guest') {
  //   // Can read and subscribe to everything
  //   can(['GET', 'SUB', 'UNSUB'], ['USERS', 'ASSETS', 'APPS', 'BOARDS', 'ROOMS', 'PRESENCE', 'MESSAGE', 'PLUGINS']);
  //   // login and update presence
  //   can(['POST', 'PUT'], ['USERS', 'PRESENCE']);

  //   // apps
  //   can(['POST', 'PUT', 'DELETE'], ['APPS']);
  //   // modify apps, not create or delete
  //   // can(['PUT'], ['APPS']);
  // } else {
  //   // everybody else can do anything
  //   can(['GET', 'POST', 'PUT', 'DELETE', 'SUB', 'UNSUB'], ['USERS', 'ASSETS', 'APPS', 'BOARDS', 'ROOMS', 'PRESENCE', 'MESSAGE', 'PLUGINS']);
  // }

  can('manage', 'all');

  return build();
}

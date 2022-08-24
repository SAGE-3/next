/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// NPM imports
import * as express from 'express';

// SAGEBase Imports
import { SBAuthSchema } from '@sage3/sagebase';
// User collection
// import { UsersCollection } from '../collections';

import { Ability, AbilityBuilder } from '@casl/ability';

export type AuthAction = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'SUB' | 'UNSUB';
export type AuthSubject = 'USERS' | 'ASSETS' | 'APPS' | 'BOARDS' | 'ROOMS' | 'PRESENCE';
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
export function checkPermissions(subj: AuthSubject): Middleware {
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

export function defineAbilityFor(user: SBAuthSchema) {
  const { can, build } = new AbilityBuilder<AppAbility>(Ability);

  if (user.provider === 'guest') {
    // Limit the guest accounts
    can(['GET', 'SUB', 'UNSUB'], ['USERS', 'ASSETS', 'APPS', 'BOARDS', 'ROOMS', 'PRESENCE']);
    can(['POST', 'PUT'], ['USERS', 'PRESENCE']);
  } else {
    //  Everything
    can(['GET', 'POST', 'PUT', 'DELETE', 'SUB', 'UNSUB'], ['USERS', 'ASSETS', 'APPS', 'BOARDS', 'ROOMS', 'PRESENCE']);
  }

  return build();
}

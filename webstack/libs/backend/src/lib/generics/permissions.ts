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

// SAGEAbility Check
import { SAGE3Ability, RoleArg, ActionArg, ResourceArg } from '@sage3/shared';

export type AuthAction = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'SUB' | 'UNSUB';

export type AuthSubject = 'USERS' | 'ASSETS' | 'APPS' | 'BOARDS' | 'ROOMS' | 'PRESENCE' | 'MESSAGE' | 'PLUGINS' | 'ANNOTATIONS' | 'LINKS';

// Map provider to role
// This is a temporary solution until we have a better way to handle roles
// To check the actual user we would have to query the database
const providerToRoleMap = {
  admin: 'admin',
  cilogon: 'user',
  google: 'user',
  apple: 'user',
  jwt: 'user',
  spectator: 'spectator',
  guest: 'guest',
};

// Conversion to RoleArg
const convertProviderToRole = (provider: string): RoleArg | undefined => {
  const role = providerToRoleMap[provider as keyof typeof providerToRoleMap] as RoleArg;
  return role;
};

// Map method to action
const methodToActionMap = {
  POST: 'create',
  GET: 'read',
  PUT: 'update',
  DELETE: 'delete',
  SUB: 'sub',
  UNSUB: 'unsub',
};

// Conversion to ActionArg
const convertMethodToAction = (method: string): ActionArg => {
  const action = methodToActionMap[method as keyof typeof methodToActionMap] as ActionArg;
  return action;
};

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
    const auth = req.user as SBAuthSchema;
    // Get Role
    const role = convertProviderToRole(auth.provider);
    if (!role) return false;
    // Convert Method to Action
    const action = convertMethodToAction(req.method as AuthAction);
    // Convert Subject to Resource
    const resource = subj.toLowerCase() as ResourceArg;
    if (SAGE3Ability.can(role, action, resource)) {
      // role is allowed, so continue on the next middleware
      next();
    } else {
      // user is forbidden
      res.status(403).json({ message: 'Forbidden user' });
    }
  };
}

export function checkPermissionsWS(auth: SBAuthSchema, act: AuthAction, subj: AuthSubject): boolean {
  // Get Role
  const role = convertProviderToRole(auth.provider);
  if (!role) return false;
  // Convert Method to Action
  const action = convertMethodToAction(act);
  // Convert Subject to Resource
  const resource = subj.toLowerCase() as ResourceArg;

  //  Check permissions for ws
  const perm = SAGE3Ability.can(role, action, resource);
  return perm;
}

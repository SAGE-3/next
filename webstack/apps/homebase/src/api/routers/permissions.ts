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

/**
 * Middleware to check if the user has permission to access the route.
 *
 * @export
 * @param {...string[]} permittedRoles
 * @returns
 */
export function checkPermissions(...permittedRoles: string[]) {
  // return a middleware
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // user is already logged in
    const user = req.user as SBAuthSchema;
    // could get more data from user collection
    // UsersCollection.get(user.id)...
    const provider = user.provider; // guest, google, cilogon, jwt
    console.log('checkPermissions>', permittedRoles, user.displayName, '-', provider, '-', req.path);
    // Check if the user has the correct role
    if (permittedRoles.includes(provider)) {
      // role is allowed, so continue on the next middleware
      next();
    } else {
      // user is forbidden
      res.status(403).json({ message: 'Forbidden user' });
    }
  };
}

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// NPM imports
import * as express from 'express';

// Collection Imports
import { UsersCollection } from '../collections';

// SAGEBase Imports
import { SBAuthSchema } from '@sage3/sagebase';

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
    const user = req.user as SBAuthSchema;
    console.log('checkPermissions>', permittedRoles, user.id, req.path);
    UsersCollection.get(user.id)
      .then((details) => {
        if (details) {
          const { name, userRole } = details.data;
          console.log('User> check', name, userRole);
          // Check if the user has the correct role
          if (permittedRoles.includes(userRole)) {
            // role is allowed, so continue on the next middleware
            next();
          } else {
            // user is forbidden
            res.status(403).json({ message: 'Forbidden user' });
          }
        } else {
          // No user details found
          res.status(403).json({ message: 'User details not found' });
        }
      })
      .catch((err) => {
        // Error getting user details
        res.status(403).json({ message: err.message });
      });
  };
}

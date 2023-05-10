/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Express Permissions middleware.

// NPM imports
import * as express from 'express';

import { UsersCollection } from '../collections';
import { SBAuthSchema } from '@sage3/sagebase';

// The actual permissions
const permissions: { [role: string]: { [action: string]: () => Promise<boolean> } } = {
  admin: {
    create: () => Promise.resolve(true),
    read: () => Promise.resolve(true),
    update: () => Promise.resolve(true),
    delete: () => Promise.resolve(true),
  },
  user: {
    create: () => Promise.resolve(true),
    read: () => Promise.resolve(true),
    update: () => Promise.resolve(true),
    delete: () => Promise.resolve(true),
  },
  guest: {
    create: () => Promise.resolve(true),
    read: () => Promise.resolve(true),
    update: () => Promise.resolve(true),
    delete: () => Promise.resolve(true),
  },
  spectator: {
    create: () => Promise.resolve(false),
    read: () => Promise.resolve(true),
    update: () => Promise.resolve(false),
    delete: () => Promise.resolve(false),
  },
};

// Map the HTTP methods to the permissions
const methodTable: { [key: string]: string } = {
  get: 'read',
  post: 'create',
  put: 'update',
  delete: 'delete',
};

// App permissions middleware
export const appPermissions = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Get the Auth object from the request
  const auth = req.user as SBAuthSchema;
  // Get the user from the UsersCollection
  const user = await UsersCollection.get(auth.id);
  // No such user. Not Authorized
  if (!user) {
    return res.status(401).send('Not Authorized');
  }
  const method = req.method.toLowerCase();
  const action = methodTable[method];
  if (!action) return res.status(500).send('Invalid method');
  // Check if the user has access to the resource
  const hasAccess = await permissions[user.data.userRole][action]();
  // If not, return Not Authorized
  if (!hasAccess) res.status(401).send('Not Authorized');

  next();
};

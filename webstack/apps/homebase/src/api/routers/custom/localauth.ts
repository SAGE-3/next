/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as bcrypt from 'bcrypt';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';

import { SBAuthDB, SBAuthSchema } from '@sage3/sagebase';
import { UsersCollection } from '../../collections';
import { config } from '../../../config';

const BCRYPT_ROUNDS = 12;

/**
 * Middleware that restricts access to server administrators.
 * Admin emails are defined in the server configuration (config.auth.admins).
 */
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authUser = req.user as SBAuthSchema;
  if (!authUser) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  const userRecord = await UsersCollection.get(authUser.id);
  const userEmail = userRecord?.data.email || '';
  const adminEmails: string[] = config.auth.admins || [];
  if (!adminEmails.includes(userEmail)) {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }
  next();
}

/**
 * Admin router for managing local authentication accounts.
 * All routes require the requester to be a server administrator.
 *
 * POST   /api/localauth/users              - Create a local user account
 * GET    /api/localauth/users              - List all local user accounts
 * DELETE /api/localauth/users/:username    - Delete a local user account
 */
export function LocalAuthRouter(): express.Router {
  const router = express.Router();
  router.use(requireAdmin);

  // Create a local user account
  router.post('/users', async (req: Request, res: Response) => {
    const { username, password, displayName, email } = req.body as {
      username?: string;
      password?: string;
      displayName?: string;
      email?: string;
    };

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'username and password are required' });
      return;
    }

    // Restrict usernames to safe characters
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      res.status(400).json({ success: false, message: 'username may only contain letters, numbers, underscores and hyphens' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const record = await SBAuthDB.createLocalUser(username, passwordHash, displayName, email);
    if (!record) {
      res.status(409).json({ success: false, message: `User '${username}' already exists` });
      return;
    }

    const { passwordHash: _omitted, ...safe } = record;
    res.status(201).json({ success: true, data: safe });
  });

  // List all local user accounts (no password hashes)
  router.get('/users', async (_req: Request, res: Response) => {
    const users = await SBAuthDB.listLocalUsers();
    res.status(200).json({ success: true, data: users });
  });

  // Delete a local user account
  router.delete('/users/:username', async (req: Request, res: Response) => {
    const { username } = req.params;
    const existing = await SBAuthDB.getLocalUser(username);
    if (!existing) {
      res.status(404).json({ success: false, message: `User '${username}' not found` });
      return;
    }
    await SBAuthDB.deleteLocalUser(username);
    res.status(200).json({ success: true });
  });

  return router;
}

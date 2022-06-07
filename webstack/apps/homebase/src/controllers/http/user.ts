/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The UserAPI for SAGE3
 *
 * Flow Diagram
 * ┌──┐  ┌─────┐  ┌─────────┐  ┌───┐
 * │DB│◄─┤Model│◄─┤ Service │◄─┤API│
 * └──┘  └─────┘  └─────────┘  └───┘
 *
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

// External Imports
import { UserRole } from '@sage3/shared/types';
import * as express from 'express';

// App Imports
import { UserService } from '../../services';

/**
 * User route/api express middleware.
 * @returns {express.Router} returns the express router object
 */
export function userExpressRouter(): express.Router {
  const router = express.Router();

  // CRUD routes

  // Create a new user: POST /api/users
  router.post('/', async ({ user, body }, res) => {
    const role = user.provider === 'guest' ? ('guest' as UserRole) : ('user' as UserRole);
    const u = await UserService.create(user.id, body.name, body.email, role);
    if (u) res.status(200).send({ success: true, data: u });
    else res.status(500).send({ success: false });
  });

  // Get all the users: GET /api/users
  router.get('/', async (req, res) => {
    const users = await UserService.readAll();
    if (users) res.status(200).send({ success: true, data: users });
    else res.status(500).send({ success: false });
  });

  // Get info about current user: GET /api/users/current
  router.get('/current', async ({ user }, res) => {
    const u = await UserService.read(user.id);
    if (u) res.status(200).send({ success: true, data: u });
    else res.status(500).send({ success6: false });
  });

  // Get one user: GET /api/users/:id
  router.get('/:id', async ({ params }, res) => {
    const user = await UserService.read(params.id);
    if (user) res.status(200).send({ success: true, data: user });
    else res.status(500).send({ success: false });
  });

  // Update one user: PUT /api/users/:id
  router.put('/:id', async ({ user, body }, res) => {
    const update = await UserService.update(user.id, body);
    if (update) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  // Delete one user: DELETE /api/users/:id
  router.delete('/:id', async ({ params }, res) => {
    const del = await UserService.delete(params.id);
    if (del) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  return router;
}

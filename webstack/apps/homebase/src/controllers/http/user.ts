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

  router.post('/', async ({ user, body }, res) => {
    const role = (user.provider === 'guest') ? 'guest' as UserRole : 'user' as UserRole;
    const u = await UserService.create(user.id, body.name, body.email, role);
    if (u) res.status(200).send({ success: true, users: [u] });
    else res.status(500).send({ success: false });
  });

  router.get('/', async (req, res) => {
    const users = await UserService.readAll();
    if (users) res.status(200).send({ success: true, users });
    else res.status(500).send({ success: false });
  });

  router.get('/current', async ({ user }, res) => {
    const u = await UserService.read(user.id);
    if (u) res.status(200).send({ success: true, users: [u] });
    else res.status(500).send({ success: false });
  });

  router.get('/id/:id', async ({ params }, res) => {
    const user = await UserService.read(params.id);
    if (user) res.status(200).send({ success: true, users: [user] });
    else res.status(500).send({ success: false });
  });

  router.put('/id/:id', async ({ user, body }, res) => {
    const update = await UserService.update(user.id, body);
    if (update) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  router.delete('/id/:id', async ({ params }, res) => {
    const del = await UserService.delete(params.id);
    if (del) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  return router;
}

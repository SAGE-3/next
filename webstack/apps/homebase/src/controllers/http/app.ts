/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The BoardAPI for SAGE3
 *
 * Flow Diagram
 * ┌──┐  ┌─────┐  ┌─────────┐  ┌───┐
 * │DB│◄─┤Model│◄─┤ Service │◄─┤API│
 * └──┘  └─────┘  └─────────┘  └───┘
 *
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

// External Importrs
import * as express from 'express';

// App Imports
import { AppService } from '../../services';

/**
 * App route/api express middleware.
 * @returns {express.Router} returns the express router object
 */
export function appExpressRouter(): express.Router {
  const router = express.Router();

  // CRUD routes

  // Create a new app: POST /api/apps
  router.post('/', async ({ user, body }, res) => {
    const app = await AppService.create(body.name, body.description, user.id, body.roomId, body.boardId, body.type, body.state);
    if (app) res.status(200).send({ success: true, data: app });
    else res.status(500).send({ success: false });
  });

  // Get all the apps: GET /api/apps
  router.get('/', async (req, res) => {
    const apps = await AppService.readAll();
    if (apps) res.status(200).send({ success: true, data: apps });
    else res.status(500).send({ success: false });
  });

  // Get one app: GET /api/apps/:id
  router.get('/:id', async ({ params }, res) => {
    const app = await AppService.read(params.id);
    if (app) res.status(200).send({ success: true, data: app });
    else res.status(500).send({ success: false });
  });

  // Update one app: PUT /api/apps/:id
  router.put('/:id', async ({ params, body }, res) => {
    const update = await AppService.update(params.id, body);
    if (update) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  // Delete one app: DELETE /api/apps/:id
  router.delete('/:id', async ({ params }, res) => {
    const del = await AppService.delete(params.id);
    if (del) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  // Custom routes

  // xxx
  router.put('/state/:id', async ({ params, body }, res) => {
    const update = await AppService.updateState(params.id, body);
    if (update) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  // xxx
  router.get('/roomId/:roomId', async ({ params }, res) => {
    const apps = await AppService.query('roomId', params);
    if (apps) res.status(200).send({ success: true, data: apps });
    else res.status(500).send({ success: false });
  });

  // xxx
  router.get('/boardId/:boardId', async ({ params }, res) => {
    const apps = await AppService.query('boardId', params);
    if (apps) res.status(200).send({ success: true, data: apps });
    else res.status(500).send({ success: false });
  });

  return router;
}

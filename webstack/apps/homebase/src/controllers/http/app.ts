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

  router.post('/', async ({ user, body }, res) => {
    const app = await AppService.createApp(body.name, body.description, user.id, body.roomId, body.boardId, body.type, body.state);
    if (app) res.status(200).send({ success: true, apps: [app] });
    else res.status(500).send({ success: false });
  });

  router.get('/', async (req, res) => {
    const apps = await AppService.readAllApps();
    if (apps) res.status(200).send({ success: true, apps });
    else res.status(500).send({ success: false });
  });

  router.get('/:id', async ({ params }, res) => {
    const app = await AppService.readApp(params.id);
    if (app) res.status(200).send({ success: true, apps: [app] });
    else res.status(500).send({ success: false });
  });

  router.get('/:roomId', async ({ params }, res) => {
    const apps = await AppService.queryApps('roomId', params);
    if (apps) res.status(200).send({ success: true, apps });
    else res.status(500).send({ success: false });
  });

  router.get('/:boardId', async ({ params }, res) => {
    const apps = await AppService.queryApps('boardId', params);
    if (apps) res.status(200).send({ success: true, apps });
    else res.status(500).send({ success: false });
  });

  router.put('/:id', async ({ params, body }, res) => {
    const updateRes = await AppService.updateApp(params.id, body);
    if (updateRes) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  router.put('/state/:id', async ({ params, body }, res) => {
    const updateRes = await AppService.updateState(params.id, body);
    if (updateRes) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  router.delete('/:id', async ({ params }, res) => {
    const delRes = await AppService.deleteApp(params.id);
    if (delRes) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  return router;
}


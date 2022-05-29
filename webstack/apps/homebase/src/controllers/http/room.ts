/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The RoomAPI for SAGE3
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
import * as express from 'express';

// App Imports
import { RoomService } from '../../services';

/**
 * Room route/api express middleware.
 * @returns {express.Router} returns the express router object
 */
export function roomExpressRouter(): express.Router {
  const router = express.Router();

  router.post('/', async ({ user, body }, res) => {
    const room = await RoomService.create(body.name, body.description, user.id);
    if (room) res.status(200).send({ success: true, rooms: [room] });
    else res.status(500).send({ success: false });
  });

  router.get('/', async (req, res) => {
    const rooms = await RoomService.readAll();
    if (rooms) res.status(200).send({ success: true, rooms });
    else res.status(500).send({ success: false });
  });

  router.get('/:id', async ({ params }, res) => {
    const room = await RoomService.read(params.id);
    if (room) res.status(200).send({ success: true, rooms: [room] });
    else res.status(500).send({ success: false });
  });

  router.put('/:id', async ({ params, body }, res) => {
    const update = await RoomService.update(params.id, body);
    if (update) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  router.delete('/:id', async ({ params }, res) => {
    const del = await RoomService.delete(params.id);
    if (del) res.status(200).send({ success: true });
    else res.status(500).send({ success: false });
  });

  return router;
}


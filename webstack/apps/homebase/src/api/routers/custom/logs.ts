/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';

/**
 * Route for clients to get the SERVER time
 * @returns
 */
export function LogsRouter(): express.Router {
  const router = express.Router();
  router.post('/', async (req, res) => {
    console.log('LogsRouter>', req.body);
    const success = true;
    if (success) res.status(200).send({ success: true, message: 'OK' });
    else res.status(500).send({ success: false, message: 'Failed' });
  });

  return router;
}

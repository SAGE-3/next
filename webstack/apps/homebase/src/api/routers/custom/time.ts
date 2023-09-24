/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
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
export function TimeRouter(): express.Router {
  const router = express.Router();
  router.get('/', (req, res) => {
    // Configuration public values
    const configuration = {
      epoch: Date.now(),
    };
    res.json(configuration);
  });

  return router;
}

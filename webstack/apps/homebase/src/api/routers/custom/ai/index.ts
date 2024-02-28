/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';

import { AiCodeRouter } from './code/aicoderouter';

// Ai Router for all the node Ai backend
export function AiRouter(): express.Router {
  const router = express.Router();

  // AI Code router
  router.use('/code', AiCodeRouter());

  return router;
}

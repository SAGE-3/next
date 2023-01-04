/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { SAGEnlp } from '@sage3/backend';

export function NLPRouter(): express.Router {
  const router = express.Router();

  router.post('/', async ({ body, user }, res) => {
    // @ts-ignore
    const userId = user.id;
    const message = body.message;

    let success = false;

    const responseMessage = await SAGEnlp.classifiedMessage(message);
    if (responseMessage) success = true;

    if (success) res.status(200).send({ success: true, message: responseMessage });
    else res.status(500).send({ success: false, message: 'Failed to process the nlp request.' });
  });

  return router;
}

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import * as express from 'express';
import { SAGEnlp } from '@sage3/backend';

export function NLPRouter(): express.Router {
  const router = express.Router();

  router.post('/', async ({ body, user }, res) => {
    // @ts-ignore
    const userId = user.id;
    const message = body.message;

    // const classifications = response.classifications;
    // let intent = '';
    // console.log(response);
    // for (let i = 0; i < classifications.length; i++) {
    //   if (classifications[i].score > 0.8 && classifications[i].intent !== 'none') {
    //     intent = classifications.intent;
    //   }
    // }
    let success = false;

    const responseMessage = await SAGEnlp.classifiedMessage(message);
    if (responseMessage) success = true;

    console.log(responseMessage);

    if (success) res.status(200).send({ success: true, message: responseMessage });
    else res.status(500).send({ success: false, message: 'Failed to process the nlp request.' });
  });

  return router;
}

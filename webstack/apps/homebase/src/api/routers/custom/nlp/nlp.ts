/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import * as express from 'express';
const { NlpManager } = require('node-nlp');

// Training Data File
import { traindata } from './test';

const manager = new NlpManager({ languages: ['en'], forceNER: true });

traindata.forEach((el) => {
  console.log(el);

  manager.addDocument('en', el.queries, el.chartType);
});
let answers = ['bar', 'line', 'map', 'pivot', 'heatmap'];

for (let i = 0; i < answers.length; i++) {
  manager.addAnswer('en', answers[i], answers[i]);
}
// This needs to be 'await'
manager.train();
manager.save();

export function NLPRouter(): express.Router {
  const router = express.Router();

  router.post('/', async ({ body, user }, res) => {
    // @ts-ignore
    const userId = user.id;
    const message = body.message;
    // TO DO Processing
    const response = await manager.process('en', message);
    const classifications = response.classifications;
    let intent = '';
    console.log(response);
    for (let i = 0; i < classifications.length; i++) {
      if (classifications[i].score > 0.8 && classifications[i].intent !== 'none') {
        intent = classifications.intent;
      }
    }
    const success = true;
    const responseMessage = response.intent;
    if (success) res.status(200).send({ success: true, message: responseMessage });
    else res.status(500).send({ success: false, message: 'Failed to process the nlp request.' });
  });

  return router;
}

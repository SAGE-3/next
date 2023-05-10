/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { SAGEnlp } from '@sage3/backend';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: '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',
});
const openai = new OpenAIApi(configuration);

export function NLPRouter(): express.Router {
  const router = express.Router();

  router.post('/', async ({ body, user }, res) => {
    // @ts-ignore
    const userId = user.id;
    const message = body.message;
    let success = false;

    // const dialogue = [
    //   {
    //     role: 'user',
    //     content: message,
    //   },
    // ];

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    if (completion) {
      success = true;
    }

    // const responseMessage = await SAGEnlp.classifiedMessage(message);
    // if (responseMessage) success = true;
    console.log(completion.data.choices[0]);

    if (success) res.status(200).send({ success: true, message: completion.data.choices[0] });
    else res.status(500).send({ success: false, message: 'Failed to process the nlp request.' });
  });

  return router;
}

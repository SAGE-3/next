/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { AppsCollection } from '../../collections';

export function HCDPRouter(): express.Router {
  const router = express.Router();

  router.post('/', async ({ body, user }, res) => {
    const url = body.url;
    // const image = body.image;
    const appId = body.appId;
    const appData = await AppsCollection.get(appId);
    AppsCollection.update(appId, user.id, { state: { ...appData?.data.state, processing: true } });

    let success = false;
    let responseMessage = null;

    const response = await fetch(url);
    if (response.status !== 200) {
      console.log('FETCH ERROR: ', response.status);
      AppsCollection.update(appId, user.id, { state: { ...appData?.data.state, processing: false } });
      res.status(500).send({ success: false, message: 'Failed to access HCDP.' });
    }
    AppsCollection.update(appId, user.id, { state: { ...appData?.data.state, processing: false } });

    console.log(response);
    res.status(200).send({ success: true, message: 'okay' });

    // TODO Write code to process geotiff
    // try {
    //   responseMessage = await postImage(prompt, image);
    // } catch (e) {
    //   console.log('STABLEDIFFUSION ERROR: ', e);
    //   AppsCollection.update(appId, user.id, { state: { processing: false, textPrompt: prompt } });
    // }

    // if (responseMessage && responseMessage['images']) success = true;
    // if (success) {
    //   const img = `data:image/jpeg;base64,${responseMessage['images'][0]}`;
    //   AppsCollection.update(appId, user.id, { state: { processing: false, imgSrc: img, textPrompt: prompt } });
    //   res.status(200).send({ success: true, message: img });
    // } else {
    //   AppsCollection.update(appId, user.id, { state: { processing: false, textPrompt: prompt } });
    //   res.status(500).send({ success: false, message: 'Failed to process the stable diffusion request.' });
    // }

    // if (success) res.status(200).send({ success: true, message: completion.data.choices[0].message?.content });

    // res.status(500).send({ success: false, message: 'Failed to process the nlp request.' });
  });

  return router;
}

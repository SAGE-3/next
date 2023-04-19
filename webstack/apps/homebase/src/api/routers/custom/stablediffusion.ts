/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { AppsCollection } from '../../collections';

export function StableDiffRouter(): express.Router {
  const router = express.Router();

  router.post('/', async ({ body, user }, res) => {
    const prompt = body.prompt;
    const image = body.image;
    const appId = body.appId;

    AppsCollection.update(appId, user.id, { state: { processing: true } });

    let success = false;
    let responseMessage = null;
    // Attempt to post the image to the stable diffusion server
    // If it fails, set the processing flag to false and return an error
    try {
      responseMessage = await postImage(prompt, image);
    } catch (e) {
      console.log('STABLEDIFFUSION ERROR: ', e);
      AppsCollection.update(appId, user.id, { state: { processing: false, textPrompt: prompt } });
    }

    // If the response message is valid, set the processing flag to false and return the image
    if (responseMessage && responseMessage['images']) success = true;
    if (success) {
      const img = `data:image/jpeg;base64,${responseMessage['images'][0]}`;
      AppsCollection.update(appId, user.id, { state: { processing: false, imgSrc: img, textPrompt: prompt } });
      res.status(200).send({ success: true, message: img });
    } else {
      AppsCollection.update(appId, user.id, { state: { processing: false, textPrompt: prompt } });
      res.status(500).send({ success: false, message: 'Failed to process the stable diffusion request.' });
    }
  });

  return router;
}

async function postImage(prompt: string, image: string) {
  // Hard coded for right now
  const url = 'http://128.171.121.90:7860';

  const payload = {
    enable_hr: 'false',
    prompt: prompt,
    seed: Math.random() * 1000000,
    sampler_name: 'Euler a',
    batch_size: 1,
    steps: 15,
    cfg_scale: 7,
    width: 512,
    height: 512,
    negative_prompt: '',
    controlnet_units: [
      {
        weight: 1.0,
        module: 'none',
        model: 'control_sd15_scribble [fef5e48e]',
        guessmode: 'false',
      },
    ],
  } as any;

  // Post image
  payload.controlnet_units[0]['input_image'] = image;
  // POST Call
  const response = await fetch(`${url}/controlnet/txt2img`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const rJson = await response.json();
  return rJson;
}

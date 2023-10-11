/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { SAGEnlp } from '@sage3/backend';

export function HCDPRouter(): express.Router {
  const router = express.Router();

  router.get('/', async ({ body, user }, res) => {
    const response = await fetch(
      'https:/ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/HCDP/production/temperature/max/month/statewide/data_map/2011/temperature_max_month_statewide_data_map_2011_03.tif '
    );
    console.log(response);

    // if (success) res.status(200).send({ success: true, message: completion.data.choices[0].message?.content });
    res.status(200).send({ success: true, message: 'okay' });

    // res.status(500).send({ success: false, message: 'Failed to process the nlp request.' });
  });

  return router;
}

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { mergeData } from './fetching-functions';
import { RAPIDQueries } from './fetching-functions';

/**
 * Route for RAPID data querying
 * @returns
 */
export function RapidRouter(): express.Router {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json('rapid router');
  });

  // Fetch and process data from Sage and Mesonet Node
  router.post('/weather_query', async (req, res) => {
    try {
      const query = req.body as RAPIDQueries;
      const data = await mergeData(query);
      res.status(200).json({ data: data });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching data' });
    }
  });

  // Fetch and process data from Sage Stats
  router.post('/sage_stats_query', (req, res) => {
    console.log('query', req.body);
    const body = req.body;
    res.json({ message: body.hey });
  });

  return router;
}

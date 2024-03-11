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

  // Fetch and process gpu data
  router.get('/sage_cpu_stats', async (req, res) => {
    try {
      const query = {
        start: '-1h',
        filter: {
          name: 'sys.freq.cpu_perc',
          vsn: 'W097',
        },
      };

      const cpuPercResponse = await fetch('https://data.sagecontinuum.org/api/v1/query', {
        method: 'POST',
        body: JSON.stringify(query),
      });

      const cpuPercData = await cpuPercResponse.text();
      console.log('cpuPercData', cpuPercData);

      const cpuParsedData = cpuPercData.split('\n').map((line) => {
        if (line !== '') {
          return JSON.parse(line);
        }
      });

      const filteredCpuParsedData = cpuParsedData.filter((dataPoint) => {
        if (dataPoint === undefined) return false;
        return true;
      });

      const formattedData = filteredCpuParsedData.map((d) => {
        return { x: d.timestamp, y: d.value };
      });

      res.status(200).json({ data: formattedData });
    } catch (error) {
      res.status(500).json({ error: error });
    }
  });

  // Fetch and process gpu data
  router.get('/sage_gpu_stats', async (req, res) => {
    try {
      const query = {
        start: '-1h',
        filter: {
          name: 'sys.freq.gpu_perc',
          vsn: 'W097',
        },
      };

      const gpuPercResponse = await fetch('https://data.sagecontinuum.org/api/v1/query', {
        method: 'POST',
        body: JSON.stringify(query),
      });

      const gpuPercData = await gpuPercResponse.text();
      console.log('gpuPercData', gpuPercData);

      const gpuParsedData = gpuPercData.split('\n').map((line) => {
        if (line !== '') {
          return JSON.parse(line);
        }
      });

      const filteredGpuParsedData = gpuParsedData.filter((dataPoint) => {
        if (dataPoint === undefined) return false;
        return true;
      });

      const formattedData = filteredGpuParsedData.map((d) => {
        return { x: d.timestamp, y: d.value };
      });

      res.status(200).json({ data: formattedData });
    } catch (error) {
      res.status(500).json({ error: error });
    }
  });

  return router;
}

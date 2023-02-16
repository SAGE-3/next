/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { PublicInfo, PublicServerConfiguration } from '@sage3/shared/types';
import * as express from 'express';
import { createClient } from 'redis';
import { config } from '../../../config';

export function ConfigRouter(): express.Router {
  const router = express.Router();

  // Get server configuration data structure
  router.get('/', async (req, res) => {
    // Open the redis connection
    const client = createClient({ url: config.redis.url });
    await client.connect();
    const token = await client.get('config:jupyter:token');
    client.disconnect();

    // Configuration public values
    const configuration = {
      serverName: config.serverName,
      port: config.port,
      production: config.production,
      version: config.version,
      features: config.features,
      // Namespace for signing uuid v5 keys
      namespace: config.namespace,
      // Jupyter token
      token: token,
      admins: config.auth.admins || [],
    } as PublicServerConfiguration;
    res.json(configuration);
  });

  return router;
}

export function InfoRouter(): express.Router {
  const router = express.Router();

  // Get server configuration data structure
  router.get('/', async (req, res) => {
    // Configuration public values
    const configuration = {
      serverName: config.serverName,
      port: config.port,
      production: config.production,
      version: config.version,
      logins: config.auth.strategies,
      isSage3: true,
    } as PublicInfo;
    res.json(configuration);
  });

  return router;
}

export function TimeRouter(): express.Router {
  const router = express.Router();
  router.get('/', async (req, res) => {
    // Configuration public values
    const configuration = {
      epoch: Date.now(),
    };
    res.json(configuration);
  });

  return router;
}

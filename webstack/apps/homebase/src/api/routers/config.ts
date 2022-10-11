/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import * as express from 'express';
import { createClient } from 'redis';
import { config } from '../../config';

export function ConfigRouter(): express.Router {
  const router = express.Router();

  // Get server configuration data structure
  router.get('/', async (req, res) => {
    // Open the redis connection
    const client = createClient({ url: config.redis.url });
    await client.connect();
    const token = await client.get('config:jupyter:token');
    console.log('REDIS> token:', token);

    // Configuration public values
    const configuration = {
      serverName: config.serverName,
      port: config.port,
      production: config.production,
      servers: config.servers,
      version: config.version,
      // Jupyter token
      token: token,
      // Namespace for signing uuid v5 keys
      namespace: config.namespace,
    };
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
      servers: config.servers,
      version: config.version,
    };
    res.json(configuration);
  });

  return router;
}

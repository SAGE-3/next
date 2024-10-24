/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { PublicInformation, OpenConfiguration } from '@sage3/shared/types';
import * as express from 'express';
import { createClient } from 'redis';
import { config } from '../../../config';

import { PresenceCollection } from '../../collections';

const JUPYTER_TOKEN_KEY = 'config:jupyter:token';
let JUPYTER_TOKEN: string | undefined = undefined;

/**
 * Fetch the jupyter token from redis
 * @returns Get the jupyter token from redis
 */
export async function getJupyterToken(): Promise<string | undefined> {
  if (JUPYTER_TOKEN !== undefined) return JUPYTER_TOKEN;
  // Open the redis connection
  const client = createClient({ url: config.redis.url });
  await client.connect();
  const token = await client.get(JUPYTER_TOKEN_KEY);
  client.disconnect();
  JUPYTER_TOKEN = token ? token : undefined;
  return JUPYTER_TOKEN;
}

export function ConfigRouter(): express.Router {
  const router = express.Router();

  // Get server configuration data structure
  router.get('/', async (req, res) => {
    // Get the jupyter token
    const token = await getJupyterToken();
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
      openai: config.services.openai || {},
      llama: config.services.llama || {},
      feedback: config.feedback || {},
    } as OpenConfiguration;
    res.json(configuration);
  });

  return router;
}

export function InfoRouter(): express.Router {
  const router = express.Router();

  // Ask presence collection for total users

  // Get server configuration data structure
  router.get('/', async (req, res) => {
    // Ask presence collection for total users
    const presenceDocs = await PresenceCollection.getAll();
    const onlineUsers = presenceDocs ? presenceDocs.length : 0;

    // Configuration public values
    const configuration = {
      serverName: config.serverName,
      port: config.port,
      production: config.production,
      version: config.version,
      logins: config.auth.strategies,
      isSage3: true,
      onlineUsers,
    } as PublicInformation;
    res.json(configuration);
  });

  return router;
}

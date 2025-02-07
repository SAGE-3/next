/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Node Imports
import { IncomingMessage, createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import * as express from 'express';

// SAGE3 Imports
import { loadConfig } from './config';
import { SAGEBase, SAGEBaseConfig } from '@sage3/sagebase';

import { ServerConfiguration } from '@sage3/shared/types';

// YJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const YUtils = require('y-websocket/bin/utils');

// ENV Import
import * as dotenv from 'dotenv';
dotenv.config();

// Port of the server.
// 3334 is the default dev environment port.
// Can be changed by setting the PORT environment variable or passing arg.
const PORT = process.env.PORT || 3334;

/**
 * The SAGE3 YJS Main entry point
 */
async function startServer() {
  console.log('Server> Starting SAGE3 YJS Server');

  const app = express();

  // Load config
  const config: ServerConfiguration = await loadConfig();

  // Initialization of SAGEBase
  const sbConfig: SAGEBaseConfig = {
    projectName: 'SAGE3',
    redisUrl: config.redis.url || 'redis://localhost:6379',
    authConfig: {
      ...config.auth,
    },
  };
  await SAGEBase.init(sbConfig, app);

  // Health check route
  app.get('/', (req, res) => {
    // Optionally, you can add checks for Redis or other services here
    // Example: Check if Redis is accessible, or check some service health

    // Respond with status 200 if everything is okay
    res.status(200).json({ status: 'healthy' });
  });

  // Create HTTP server
  const server = createServer(app);

  // Start listening
  server.listen(PORT, () => {
    console.log(`SAGE3 YJS Server> Listening on port ${PORT}`);
  });

  // Create WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  // WebSocket API for YJS
  wss.on('connection', (socket: WebSocket, _request: IncomingMessage, args: any) => {
    YUtils.setupWSConnection(socket, _request, args);
  });

  server.on('upgrade', (request, socket, head) => {
    // get url path
    const pathname = request.url;
    if (!pathname) return;
    // Ensure it is a YJS path
    const wsPath = pathname.split('/')[1];
    if (wsPath !== 'yjs') return;

    SAGEBase.Auth.sessionParser(request, {}, () => {
      const session = (request as any).session;
      if (!session?.passport?.user) {
        console.log('Authorization> WebSocket upgrade failed: Unauthorized');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      // E
      wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        wss.emit('connection', ws, request);
      });
    });
  });

  // Handle termination
  async function exitHandler() {
    console.log('ExitHandler> Closing server...');
    await new Promise((resolve) => server.close(resolve));
    process.exit(0);
  }

  // Clean shutdown on signals
  if (!config.production) {
    process.on('exit', exitHandler);
    process.on('SIGINT', exitHandler);
    process.on('SIGUSR1', exitHandler);
    process.on('SIGUSR2', exitHandler);
    process.on('SIGTERM', exitHandler);
    process.on('warning', (e) => console.warn('Warning>', e.stack));
  }
}

startServer();

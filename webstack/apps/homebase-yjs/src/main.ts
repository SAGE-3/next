/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
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

  // Create HTTP server
  const server = createServer(app);

  // Start listening
  const port = config.production ? 3001 : config.port + 1;
  server.listen(port, () => {
    console.log(`SAGE3 YJS Server> Listening on port ${port}`);
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

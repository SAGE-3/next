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
      production: config.production,
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

  // Port to serve app
  const PORT = config.port_yjs;

  // Start listening
  server.listen(PORT, () => {
    console.log(`SAGE3 YJS Server> Listening on port ${PORT}`);
  });

  // Create WebSocket Server for YJS
  const yjsSocketServer = new WebSocketServer({ noServer: true });

  // WebSocket API for YJS
  yjsSocketServer.on('connection', (socket: WebSocket, _request: IncomingMessage, args: any) => {
    YUtils.setupWSConnection(socket, _request, args);
  });

  // Websocket API for WebRTC
  const rtcSocketServer = new WebSocket.Server({ noServer: true });
  const clients: Map<string, WebSocket[]> = new Map();
  // Broadcast to all clients in the room
  function emitRTC(room: string, type: string, params: any) {
    const msg = JSON.stringify({ type, params });
    clients.get(room)?.forEach((ws) => ws.send(msg));
  }

  rtcSocketServer.on('connection', (socket: WebSocket, _request: IncomingMessage) => {
    // new message
    socket.on('message', (data) => {
      const datastr = data.toString();
      const msg = JSON.parse(datastr);
      switch (msg.type) {
        case 'join':
          if (!clients.has(msg.params.room)) {
            clients.set(msg.params.room, []);
          }
          clients.get(msg.params.room)?.push(socket);
          break;
        case 'pixels':
          // broadcast to all clients in the room
          emitRTC(msg.params.room, 'data', msg.params);
          break;
        case 'leave':
          clients.get(msg.params.room)?.splice(clients.get(msg.params.room)?.indexOf(socket) || 0, 1);
          break;
      }
    });
    // close handler
    socket.on('close', () => {
      clients.forEach((sockets) => {
        sockets.splice(sockets.indexOf(socket) || 0, 1);
      });
    });
    // error handler
    socket.on('error', (msg) => {
      console.log('WebRTC> error', msg);
      clients.forEach((sockets) => {
        sockets.splice(sockets.indexOf(socket) || 0, 1);
      });
    });
  });

  server.on('upgrade', (request, socket, head) => {
    // get url path
    const pathname = request.url;
    if (!pathname) return;

    // Get Pathname
    const wsPath = pathname.split('/')[1];

    // YJS Stuff
    if (wsPath == 'yjs') {
      SAGEBase.Auth.sessionParser(request, {}, () => {
        const session = (request as any).session;
        if (!session?.passport?.user) {
          console.log('Authorization> WebSocket upgrade failed: Unauthorized');
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        // E
        yjsSocketServer.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          yjsSocketServer.emit('connection', ws, request);
        });
      });
    }

    // WebRTC socket - noauth for now
    if (wsPath === 'rtc') {
      rtcSocketServer.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        rtcSocketServer.emit('connection', ws, request);
      });
      return;
    }
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

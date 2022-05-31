/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * @server main webserver function.
 * @author <a href="mailto:andrewtburks@gmail.com">Andrew Burks</a>
 * @author <a href="mailto:renambot@gmail.com">Luc Renambot</a>
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

/**
 * Node Modules
 */
import * as path from 'path';
import { IncomingMessage, Server } from 'http';

// Websocket
import { WebSocket } from 'ws';
import { SubscriptionCache } from '@sage3/backend';

// Create the web server with Express
import { createApp, listenApp, serveApp } from './web';
import { loadCredentials, listenSecureApp } from './web';

/**
 * SAGE3 Libs
 */
import { loadConfig } from './config';
// import { AssetService } from './services';
import { expressAPIRouter, wsAPIRouter } from './controllers';
import { loadModels } from './models';
import { SAGEBase, SAGEBaseConfig } from '@sage3/sagebase';

import { APIClientWSMessage, serverConfiguration } from '@sage3/shared/types';

// Exception handling
process.on('unhandledRejection', (reason: Error) => {
  console.error('Server> Error', reason);
  process.exit(1);
});

/**
 * The SAGE3 Main entry point
 */
async function startServer() {
  // Load the right configuration file
  const config: serverConfiguration = await loadConfig();

  // Create the Express object
  const assetPath = path.join(config.root, config.assets);
  const app = createApp(assetPath);

  // HTTP/HTTPS server
  let server: Server;

  // Create the server
  if (config.production) {
    // load the HTTPS certificates in production mode
    const credentials = loadCredentials(config);
    // Create the server
    server = listenSecureApp(app, credentials, config.port);
  } else {
    // Create and start the HTTP web server
    server = listenApp(app, config.port);
  }

  // Initialization of SAGEBase
  const sbConfig: SAGEBaseConfig = {
    projectName: 'SAGE3',
    redisUrl: config.redis.url || 'redis://localhost:6379',
    authConfig: {
      sessionMaxAge: config.auth.sessionMaxAge,
      sessionSecret: config.auth.sessionSecret,
      strategies: {
        guestConfig: config.auth.guestConfig,
        googleConfig: config.auth.googleConfig,
      },
    },
  };
  await SAGEBase.init(sbConfig, app);

  // Load all the models: user, board, ...
  await loadModels();

  // Load the API Routes
  app.use('/api', expressAPIRouter());

  // Websocket setup
  const apiWebSocketServer = new WebSocket.Server({ noServer: true });
  const yjsWebSocketServer = new WebSocket.Server({ noServer: true });

  // Websocket API for sagebase
  apiWebSocketServer.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    // A Subscription Cache to track what subscriptions the user currently has.
    const subCache = new SubscriptionCache();

    socket.on('message', (msg) => {
      const message = JSON.parse(msg.toString()) as APIClientWSMessage;
      wsAPIRouter(socket, request, message, subCache);
    });

    socket.on('close', () => {
      subCache.deleteAll();
    });
  });

  // Websocket API for YJS
  yjsWebSocketServer.on('connection', (socket: WebSocket, _request: IncomingMessage) => {
    socket.on('message', (msg) => {
      console.log('YJS> message', msg);
    });
  });

  // Upgrade an HTTP request to a WebSocket connection
  server.on('upgrade', (request, socket, head) => {
    // get url path
    const pathname = request.url;
    if (!pathname) return;
    // get the first word of the url
    const wsPath = pathname.split('/')[1];

    SAGEBase.Auth.sessionParser(request, {}, () => {
      if (!request.session.passport?.user) {
        // console.log('not authorized');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      if (wsPath === 'api') {
        apiWebSocketServer.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          apiWebSocketServer.emit('connection', ws, request);
        });
      } else if (wsPath === 'yjs') {
        yjsWebSocketServer.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          yjsWebSocketServer.emit('connection', ws, request);
        });
      }
    });
  });

  // Serves the static react files from webapp folder
  serveApp(app, path.join(__dirname, 'webapp'));

  // Handle termination
  function exitHandler() {
    console.log('in exit handler, disconnect sockets');
    apiWebSocketServer.close();
    yjsWebSocketServer.close();
    process.exit(2);
  }

  // Handlers during development
  if (config.production == false) {
    process.on('exit', exitHandler);
    process.on('SIGINT', exitHandler);
    process.on('SIGUSR1', exitHandler);
    process.on('SIGUSR2', exitHandler);
    process.on('SIGTERM', exitHandler);
    process.on('warning', (e) => console.warn('Warning>', e.stack));
  }
}

// Go go go
startServer();

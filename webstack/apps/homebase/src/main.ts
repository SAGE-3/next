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
import * as fsModule from 'fs';
import * as https from 'https';
import * as path from 'path';
import * as url from 'url';
import { parse } from 'url';

import { AddressInfo } from 'net';
import { IncomingMessage, Server } from 'http';
// Declare fs with Promises
const fs = fsModule.promises;

// Websocket
import { WebSocket } from 'ws';
import { SubscriptionCache } from '@sage3/backend';

// Create the web server with Express
import { createApp, listenApp, serveApp } from './web';

/**
 * SAGE3 Libs
 */
import { loadConfig } from './config';
// import { AssetService } from './services';
import { expressAPIRouter, wsAPIRouter } from './controllers';
import { loadModels } from './models';
// import { connectFluent, multerMiddleware } from './connectors';
import { SAGEBase, SAGEBaseConfig } from '@sage3/sagebase';

import { APIWSMessage, serverConfiguration } from '@sage3/shared/types';

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

  // // Multi-file upload
  // app.use(multerMiddleware('files'));

  // // Setup the connection for logging
  // connectFluent(app);

  // HTTP/HTTPS server
  let server: Server;

  // Read certificates in production
  if (config.production) {
    // SSL certificate imports for HTTPS
    const privateKeyFile = path.join(config.root, 'keys', config.keys.ssl.certificateKeyFile);
    const certificateFile = path.join(config.root, 'keys', config.keys.ssl.certificateFile);
    const caFile = path.join(config.root, 'keys', config.keys.ssl.certificateChainFile);
    try {
      fsModule.accessSync(privateKeyFile, fsModule.constants.R_OK);
    } catch (err) {
      throw new Error(`Private key file ${privateKeyFile} not found or unreadable.`);
    }
    try {
      fsModule.accessSync(certificateFile, fsModule.constants.R_OK);
    } catch (err) {
      throw new Error(`Certificate file ${certificateFile} not found or unreadable.`);
    }
    try {
      fsModule.accessSync(caFile, fsModule.constants.R_OK);
    } catch (err) {
      throw new Error(`Certificate file ${caFile} not found or unreadable.`);
    }
    const privateKey = await fs.readFile(privateKeyFile, 'utf8');
    const certificate = await fs.readFile(certificateFile, 'utf8');
    const ca = await fs.readFile(caFile).toString();
    const credentials = {
      // Keys
      key: privateKey,
      cert: certificate,
      ca: ca,
      // Control the supported version of TLS
      minVersion: config.tlsVersion,
      maxVersion: config.tlsVersion,
      // Settings
      requestCert: false,
      rejectUnauthorized: true,
      honorCipherOrder: true,
    } as https.ServerOptions;

    // Create the HTTPS server
    server = https.createServer(credentials, app);
    // 0.0.0.0 forces to listen on IPv4 on every interfaces
    server.listen(config.port, '0.0.0.0', () => {
      const { port } = server.address() as AddressInfo;
      console.log('HTTPS> listening on port', port);
    });
  } else {
    // Start the HTTP web server
    server = listenApp(app, config.port);
  }

  // Init SAGEBase
  // SAGEBase
  const sbConfig = {
    projectName: 'SAGE3',
    authConfig: {
      sessionMaxAge: 1000 * 60 * 60 * 24 * 7,
      sessionSecret: 'SUPERSECRET!!$$',
      strategies: {
        guestConfig: {
          routeEndpoint: '/auth/guest',
        },
        googleConfig: {
          clientSecret: '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',
          clientID: '416190066680-brpp3rgo9m271euoihnruhc3in3ipsi7.apps.googleusercontent.com',
          routeEndpoint: '/auth/google',
          callbackURL: '/auth/google/redirect',
        },
      },
    },
  } as SAGEBaseConfig;
  await SAGEBase.init(sbConfig, app);

  // Load all the models: user, board, ...
  await loadModels();

  // Load the API Routes
  app.use('/api', expressAPIRouter());

  // Websocket setup
  const apiWebSocketServer = new WebSocket.Server({ noServer: true });
  const yjsWebSocketServer = new WebSocket.Server({ noServer: true });

  apiWebSocketServer.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    // A Subscription Cache to track what subscriptions the user currently has.
    const subCache = new SubscriptionCache();

    socket.on('message', (msg) => {
      const message = JSON.parse(msg.toString()) as APIWSMessage;
      wsAPIRouter(socket, request, message, subCache);
    });

    socket.on('close', () => {
      subCache.deleteAll();
    });
  });

  yjsWebSocketServer.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    console.log('NEW YJS SOCKET');
    socket.on('message', (msg) => {
      console.log(msg);
    });
  });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url);
    // const { pathname } = new url.URL(request.url);

    if (pathname === null) return;
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

/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
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
import * as fs from 'fs';
import { IncomingMessage } from 'http';
import * as dns from 'node:dns';

// Websocket
import { WebSocket } from 'ws';
import { SAGEnlp, SAGE_PRESENCE, SocketPresence, SubscriptionCache } from '@sage3/backend';
import { setupWsforLogs } from './api/routers/custom';

// Create the web server with Express
import { createApp, listenApp, serveApp } from './web';

// Check the token on websocket connection
import * as jwt from 'jsonwebtoken';

/**
 * SAGE3 Libs
 */
import { loadConfig } from './config';
// import { AssetService } from './services';
import { expressAPIRouter, wsAPIRouter } from './api/routers';
import { AppsCollection, loadCollections, PresenceCollection } from './api/collections';
import { SAGEBase, SAGEBaseConfig } from '@sage3/sagebase';

import { APIClientWSMessage, ServerConfiguration } from '@sage3/shared/types';
import { SBAuthDB, JWTPayload } from '@sage3/sagebase';

// SAGE Twilio Helper Import
import { SAGETwilio } from '@sage3/backend';
import * as express from 'express';

// Exception handling
process.on('unhandledRejection', (reason: Error) => {
  console.error('Server> Error', reason);
  process.exit(1);
});

/**
 * The SAGE3 Main entry point
 */
async function startServer() {
  console.log('Server> Starting SAGE3 Server');

  // Load the right configuration file
  const config: ServerConfiguration = await loadConfig();

  // Reverts the old DNS order, from v17 and up
  dns.setDefaultResultOrder('ipv4first');

  // Create the Express object
  const assetPath = path.join(config.root, config.assets);
  const app = createApp(assetPath, config);

  // Port to serve app
  const PORT = config.port;

  // Create the server
  const server = listenApp(app, PORT);

  // Log Level
  // partial: only core logs are sent to fluentd (all user logs are ignored (Presence, User))
  const logCollections = ['APPS', 'ASSETS', 'BOARDS', 'PLUGINS', 'ROOMS'];
  // all: all logs are sent to fluentd
  if (config.fluentd.databaseLevel === 'all') logCollections.push('USERS', 'PRESENCE', 'MESSAGE', 'INSIGHT');
  // none: no logs are sent to fluentd
  if (config.fluentd.databaseLevel === 'none') logCollections.length = 0;
  const sbLogConfig = {
    server: config.fluentd.server,
    port: config.fluentd.port,
    collections: logCollections,
  };
  console.log(
    `Server> Database Loggger set to ${config.fluentd.databaseLevel.toUpperCase()}, logging collections:`,
    sbLogConfig.collections
  );

  // Initialization of SAGEBase
  const sbConfig: SAGEBaseConfig = {
    projectName: 'SAGE3',
    redisUrl: config.redis.url || 'redis://localhost:6379',
    authConfig: {
      ...config.auth,
    },
    logConfig: sbLogConfig,
  };
  await SAGEBase.init(sbConfig, app);

  // init AI models
  await SAGEnlp.init();

  // Load all the models: user, board, ...
  await loadCollections();

  // Twilio Setup
  const screenShareTimeLimit = 3600 * 6 * 1000; // 6 hours
  const twilio = new SAGETwilio(config.services.twilio, AppsCollection, PresenceCollection, 10000, screenShareTimeLimit);
  app.get('/twilio/token', SAGEBase.Auth.authenticate, (req, res) => {
    const authId = req.user.id;
    if (authId === undefined) {
      res.status(403).send();
    }
    const room = req.query.room as string;
    const identity = req.query.identity as string;
    const token = twilio.generateVideoToken(identity, room);
    res.send({ token });
  });

  // Load the API Routes
  app.use('/api', expressAPIRouter());

  // Websocket setup
  const apiWebSocketServer = new WebSocket.Server({ noServer: true });

  const logsServer = new WebSocket.Server({ noServer: true });

  logsServer.on('connection', (socket: WebSocket) => {
    setupWsforLogs(socket);
  });

  // Load Redis Presnce
  SAGE_PRESENCE.init(config.redis.url, 'SAGE3', PresenceCollection);

  // Websocket API for sagebase
  apiWebSocketServer.on('connection', (socket: WebSocket, req: IncomingMessage) => {
    // The authSchema of the current user
    const user = req.user;

    // Create a subscription cache for this connection.
    // A Subscription Cache to track the subscriptions the user has.
    const subCache = new SubscriptionCache(socket);

    // A helper class to track the presence of users.
    new SocketPresence(user.id, socket);

    socket.on('message', (msg) => {
      try {
        const message = JSON.parse(msg.toString()) as APIClientWSMessage;
        wsAPIRouter(socket, message, user, subCache);
      } catch (err) {
        console.error('Server> Error parsing message:', msg.toString());
        console.error('       ', err.message);
      }
    });

    socket.on('close', () => {
      console.log('apiWebSocketServer> connection closed');
    });

    socket.on('error', () => {
      console.log('apiWebSocketServer> error');
    });
  });

  // Upgrade an HTTP request to a WebSocket connection
  server.on('upgrade', (request, socket, head) => {
    // TODO: Declarations file was being funny again
    const req = request as any;
    // get url path
    const pathname = request.url;
    if (!pathname) return;
    // get the first word of the url
    const wsPath = pathname.split('/')[1];

    // Logs socket - noauth for now
    if (wsPath === 'logs') {
      logsServer.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        logsServer.emit('connection', ws, req);
      });
      return;
    }

    SAGEBase.Auth.sessionParser(request, {}, () => {
      let token = request.headers.authorization;
      if (config.auth.jwtConfig && token) {
        // extract the token from the header
        token = token.split(' ')[1];
        // Read the public key
        const keyFile = config.auth.jwtConfig?.publicKey || 'jwt_public.pem';
        const pubkey = fs.readFileSync(keyFile);
        // Check is token valid
        jwt.verify(token, pubkey, { algorithms: ['RS256'] }, async (err, decoded) => {
          if (err) {
            console.log('not authorized');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          } else {
            console.log('Authorization> ws ok', decoded?.sub);
            const payload = decoded as JWTPayload;
            if (decoded?.sub) {
              const displayName = payload.name;
              const email = payload.sub;
              const extras = {
                displayName: displayName ?? '',
                email: email ?? '',
                picture: '',
              };
              // Find the actual user based on the token information
              const authRecord = await SBAuthDB.findOrAddAuth('jwt', payload.sub, extras);
              // Add the info to the request
              req.user = authRecord;
              if (wsPath === 'api') {
                apiWebSocketServer.handleUpgrade(req, socket, head, (ws: WebSocket) => {
                  apiWebSocketServer.emit('connection', ws, req);
                });
              }
            }
          }
        });
      } else {
        if (!req.session.passport?.user) {
          // Auth coming from a logged user
          console.log('Authorization> ws failed');
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        if (wsPath === 'api') {
          apiWebSocketServer.handleUpgrade(req, socket, head, (ws: WebSocket) => {
            // Add the user info from passport to the ws request
            req.user = req.session.passport?.user;
            apiWebSocketServer.emit('connection', ws, req);
          });
        }
      }
    });
  });

  // Serve the static react files from webapp folder
  serveApp(app, path.join(__dirname, 'webapp'));
  // Serve the plugins folder
  app.use('/plugins', express.static(path.join(__dirname, 'plugins'), { maxAge: '1d' }));

  // Handle termination
  function exitHandler() {
    console.log('ExitHandler> disconnect sockets');
    apiWebSocketServer.close();
    logsServer.close();
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

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
import { IncomingMessage, Server } from 'http';
import * as dns from 'node:dns';

// Websocket
import { WebSocket } from 'ws';
import { SAGEnlp, SAGEPresence, SubscriptionCache } from '@sage3/backend';

// YJS
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Y from 'yjs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const YUtils = require('y-websocket/bin/utils');

// Create the web server with Express
import { createApp, listenApp, serveApp } from './web';
import { loadCredentials, listenSecureApp } from './web';

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

import { APIClientWSMessage, serverConfiguration } from '@sage3/shared/types';
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
  // Load the right configuration file
  const config: serverConfiguration = await loadConfig();

  // Reverts the old DNS order, from v17 and up
  dns.setDefaultResultOrder('ipv4first');

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
      ...config.auth,
    },
  };
  await SAGEBase.init(sbConfig, app);

  // init AI models
  await SAGEnlp.init();

  // Load all the models: user, board, ...
  await loadCollections();

  // Twilio Setup
  const screenShareTimeLimit = 60 * 60 * 1000; // 1 hour
  const twilio = new SAGETwilio(config.twilio, AppsCollection, PresenceCollection, 10000, screenShareTimeLimit);
  app.get('/twilio/token', SAGEBase.Auth.authenticate, (req, res) => {
    const authId = req.user.id;
    if (authId === undefined) {
      res.status(403).send();
    }
    const room = req.query.room as string;
    const token = twilio.generateVideoToken(authId, room);
    res.send({ token });
  });

  // Load the API Routes
  app.use('/api', expressAPIRouter());

  // Websocket setup
  const apiWebSocketServer = new WebSocket.Server({ noServer: true });
  const yjsWebSocketServer = new WebSocket.Server({ noServer: true });
  const rtcWebSocketServer = new WebSocket.Server({ noServer: true });

  // Websocket API for sagebase
  apiWebSocketServer.on('connection', (socket: WebSocket, req: IncomingMessage) => {
    // The authSchema of the current user
    const user = req.user;

    // Create a subscription cache for this connection.
    // A Subscription Cache to track the subscriptions the user has.
    const subCache = new SubscriptionCache(socket);

    // A helper class to track the presence of users.
    const presence = new SAGEPresence(user.id, socket, PresenceCollection);
    presence.init();

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

  // Websocket API for YJS
  yjsWebSocketServer.on('connection', (socket: WebSocket, _request: IncomingMessage, args: any) => {
    YUtils.setupWSConnection(socket, _request, args);
  });

  // Websocket API for WebRTC
  const clients: Record<string, WebSocket> = {};

  function emitRTC(name: string, socket: WebSocket, data: any) {
    for (const k in clients) {
      const sock = clients[k];
      if (sock !== socket) {
        sock.send(JSON.stringify({ type: name, data: data }));
      }
    }
  }
  async function sendRTC(name: string, socket: WebSocket, data: any) {
    socket.send(JSON.stringify({ type: name, data: data }));
  }

  rtcWebSocketServer.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    console.log('WebRTC> connection', request.url);

    if (request.url) {
      const parts = request.url.split('/');
      const roomID = parts[parts.length - 1];
      console.log('WebRTC> roomID', roomID);
    }

    socket.on('message', (data) => {
      const datastr = data.toString();
      const msg = JSON.parse(datastr);
      if (msg.type === 'join') {
        clients[msg.user] = socket;
        emitRTC('join', socket, msg);
        console.log('WebRTC> connection #', Object.keys(clients).length);
        sendRTC('clients', socket, Object.keys(clients));
      } else if (msg.type === 'create') {
        clients[msg.user] = socket;
        console.log('WebRTC> new group for', msg.app);
      } else if (msg.type === 'paint') {
        emitRTC('paint', socket, msg.data);
      }
    });
    socket.on('close', (_msg) => {
      console.log('WebRTC> close');
      // Delete the socket from the clients array
      for (const [key, value] of Object.entries(clients)) {
        if (value === socket) {
          delete clients[key];
          emitRTC('left', socket, key);
        }
      }
      console.log('WebRTC> connection #', Object.keys(clients).length);
    });
    socket.on('error', (msg) => {
      console.log('WebRTC> error', msg);
      // Delete the socket from the clients array
      for (const [key, value] of Object.entries(clients)) {
        if (value === socket) {
          delete clients[key];
        }
      }
      console.log('WebRTC> connection #', Object.keys(clients).length);
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

    // WebRTC socket - noauth for now
    if (wsPath === 'rtc') {
      rtcWebSocketServer.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        rtcWebSocketServer.emit('connection', ws, req);
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
              } else if (wsPath === 'yjs') {
                yjsWebSocketServer.handleUpgrade(req, socket, head, (ws: WebSocket) => {
                  yjsWebSocketServer.emit('connection', ws, req);
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
        } else if (wsPath === 'yjs') {
          yjsWebSocketServer.handleUpgrade(req, socket, head, (ws: WebSocket) => {
            yjsWebSocketServer.emit('connection', ws, req);
          });
        }
      }
    });
  });

  // Serves the static react files from webapp folder
  serveApp(app, path.join(__dirname, 'webapp'));
  app.use('/plugins', express.static(path.join(__dirname, 'plugins')));

  // Handle termination
  function exitHandler() {
    console.log('in exit handler, disconnect sockets');
    apiWebSocketServer.close();
    yjsWebSocketServer.close();
    rtcWebSocketServer.close();
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

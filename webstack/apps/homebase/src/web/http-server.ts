/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Node modules
import * as path from 'path';
import { AddressInfo } from 'net';
import { Server } from 'http';

// Express web server framework
import * as express from 'express';

// Express middlewares
import helmet from 'helmet';
import * as compression from 'compression';
import * as cors from 'cors';
import * as morgan from 'morgan';
import * as favicon from 'serve-favicon';
import * as cookieParser from 'cookie-parser';

/**
 * Create a HTTP server
 *
 * @export
 * @param {string} assetPath
 * @returns {express.Express}
 */
export function createApp(assetPath: string): express.Express {
  // Express app
  const app = express();

  // Set express attributes
  app.use(favicon(path.join(assetPath, 'favicon.ico')));

  // Enable reverse proxy support in Express. This causes the
  // the "X-Forwarded-Proto" header field to be trusted so its
  // value can be used to determine the protocol. See
  // http://expressjs.com/en/api.html#app.settings.table for more details.
  app.enable('trust proxy');

  // Cookies
  app.use(cookieParser());
  // using express to parse JSON bodies into JS objects
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // adding Helmet to enhance your API's security
  // Disabling a few rules for now, easier during development
  app.use(
    helmet({
      // Content-Security-Policy
      contentSecurityPolicy: false,
      // Strict-Transport-Security
      hsts: true,
      // crossOriginEmbedderPolicy: false
      crossOriginEmbedderPolicy: { policy: 'require-corp' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
    })
  );

  // Enabling CORS for all requests
  app.use(cors());
  // Compress the traffic
  app.use(compression());

  // Adding a logger to HTTP requests
  // combined: Standard Apache combined log output
  // values: combined tiny ...
  // Send tiny format to stdout
  // app.use(morgan('combined'));
  app.use(
    morgan('tiny', {
      // Ignore the HTTP 200 good messages
      skip: function (req: express.Request, res: express.Response) {
        return res.statusCode === 200 || res.statusCode === 304;
      },
    })
  );

  return app;
}

/**
 * Select the port to listen on
 *
 * @export
 * @param {express.Express} app
 * @param {number} listenPort
 * @returns {Server}
 */
export function listenApp(app: express.Express, listenPort: number): Server {
  // HTTP server
  const server = app.listen(listenPort, '0.0.0.0', () => {
    const { port } = server.address() as AddressInfo;
    console.log('HTTP> listening on port', port);
  });
  return server;
}

/**
 * Serve a folder statically
 *
 * @export
 * @param {express.Express} app
 * @param {string} webPath
 */
export function serveApp(app: express.Express, webPath: string): void {
  // Serves the static react files from webapp folder
  app.use('/', express.static(webPath));
}

// Basic express router setup

import { ServerConfiguration } from '@sage3/shared/types';
import expressAPIRouter from './api/router';

import * as express from 'express';
import * as dns from 'node:dns';
import { loadConfig } from './config';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cors from 'cors';
import * as cookieParser from 'cookie-parser';
import { Server } from 'http';
import { SAGEBaseConfig, SAGEBase } from '@sage3/sagebase';
import { AddressInfo } from 'net';
/**
 * Create a HTTP server
 *
 * @export
 * @param {string} assetPath
 * @returns {express.Express}
 */
export function createApp(): express.Express {
  // Express app
  const app = express();

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
      // Cross-Origin-Embedder-Policy: disable to enable map images and zoom images to load
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );

  // Enabling CORS for all requests
  app.use(cors());
  // Compress the traffic
  app.use(compression());

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
export function listenApp(app: express.Express, listenPort: number | string): Server {
  const PORT = parseInt(listenPort as string, 10);
  // HTTP server
  const server = app.listen(PORT, '0.0.0.0', () => {
    const { port } = server.address() as AddressInfo;
    console.log('HTTP> listening on port', port);
  });
  return server;
}

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
  const app = createApp();

  // Port to serve app
  const PORT = config.port_files;

  // Create the server
  listenApp(app, PORT);

  // Initialization of SAGEBase
  const sbConfig: SAGEBaseConfig = {
    projectName: 'SAGE3',
    redisUrl: config.redis.url || 'redis://localhost:6379',
    authConfig: {
      ...config.auth,
    },
  };
  await SAGEBase.init(sbConfig, app);

  const router = await expressAPIRouter();
  // Load the API Routes
  app.use('/api', router);

  // Health check
  app.get('/', (req, res) => {
    res.status(200).send('OK');
  });

  // Handle termination
  function exitHandler() {
    console.log('ExitHandler> disconnect sockets');
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

/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Node Modules
 */
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import { AddressInfo } from 'net';

// Express web server framework
import * as express from 'express';

// Web server configuraton type
import { serverConfiguration } from '@sage3/shared/types';

/**
 * Load SSL keys
 *
 * @export
 * @param {serverConfiguration} config
 * @returns {https.ServerOptions}
 */
export function loadCredentials(config: serverConfiguration): https.ServerOptions {
  // SSL certificate imports for HTTPS
  const basePath = path.join(config.root, 'keys');
  const privateKeyFile = path.join(basePath, config.keys.ssl.certificateKeyFile);
  const certificateFile = path.join(basePath, config.keys.ssl.certificateFile);
  const caFile = path.join(basePath, config.keys.ssl.certificateChainFile);
  try {
    fs.accessSync(privateKeyFile, fs.constants.R_OK);
  } catch (err) {
    throw new Error(`Private key file ${privateKeyFile} not found or unreadable.`);
  }
  try {
    fs.accessSync(certificateFile, fs.constants.R_OK);
  } catch (err) {
    throw new Error(`Certificate file ${certificateFile} not found or unreadable.`);
  }
  try {
    fs.accessSync(caFile, fs.constants.R_OK);
  } catch (err) {
    throw new Error(`Certificate file ${caFile} not found or unreadable.`);
  }
  // load all the certificates
  const privateKey = fs.readFileSync(privateKeyFile, 'utf8');
  const certificate = fs.readFileSync(certificateFile, 'utf8');
  const ca = fs.readFileSync(caFile).toString();
  // Build an http server option structure
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

  return credentials;
}

/**
 * Create a HTTPS server and start listening
 *
 * @export
 * @param {express.Express} app
 * @param {https.ServerOptions} credentials
 * @param {number} listenPort
 * @returns {https.Server}
 */
export function listenSecureApp(app: express.Express, credentials: https.ServerOptions, listenPort: number): https.Server {
  // Create the HTTPS server
  const server = https.createServer(credentials, app);
  // 0.0.0.0 forces to listen on IPv4 on every interfaces
  server.listen(listenPort, '0.0.0.0', () => {
    const { port } = server.address() as AddressInfo;
    console.log('HTTPS> listening on port', port);
  });
  return server;
}

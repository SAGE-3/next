/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Node Modules
 */
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import { AddressInfo } from 'net';
// Nodejs crypto module to analyze the certificate
import * as crypto from 'crypto';
// Date management
import { formatDistance } from 'date-fns';

// Express web server framework
import * as express from 'express';

// Web server configuraton type
import { ServerConfiguration } from '@sage3/shared/types';

/**
 * Load SSL keys
 *
 * @export
 * @param {ServerConfiguration} config
 * @returns {https.ServerOptions}
 */
export function loadCredentials(config: ServerConfiguration): https.ServerOptions {
  // SSL certificate imports for HTTPS
  const basePath = path.join(config.root, 'keys');
  const privateKeyFile = path.join(basePath, config.ssl.certificateKeyFile);
  const certificateFile = path.join(basePath, config.ssl.certificateFile);
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
  // load all the certificates
  const privateKey = fs.readFileSync(privateKeyFile, 'utf8');
  const certificates = fs.readFileSync(certificateFile, 'utf8');

  console.log('CERT> =====================================');

  // Split the certificate chain
  const listCERTS: Array<string> = [];
  const lines = certificates.toString().split('\n');
  let tempcert = [];
  for (const ln of lines) {
    if (ln) {
      tempcert.push(ln);
      if (ln.includes('END CERTIFICATE')) {
        const acert = tempcert.join('\n');
        listCERTS.push(acert);
        tempcert = [];
      }
    }
  }
  console.log('CERT> chain length:', listCERTS.length);

  // Analyze the certificates (array of certs)
  for (let idx = 0; idx < listCERTS.length; idx++) {
    // Get the next one
    const c = listCERTS[idx];
    // Build a cert object
    const acert = new crypto.X509Certificate(c);
    const subject = acert.subject.replaceAll('\n', '-');
    console.log('CERT> subject', subject);
    const issuer = acert.issuer.replaceAll('\n', '-');
    console.log('CERT> issuer', issuer);
    if (acert.infoAccess) {
      const infoAccess = acert.infoAccess.replaceAll('\n', '-');
      console.log('CERT> infoAccess', infoAccess);
    }
    // Show the validity period
    const dateFrom = new Date(acert.validFrom).toLocaleDateString();
    const validTo = new Date(acert.validTo).toLocaleDateString();
    const expires = formatDistance(new Date(acert.validTo), new Date(), { addSuffix: true });
    console.log('CERT> Valid: from->', dateFrom, '-- to->', validTo, '-- Expires->', expires);

    // First one should be the host certificate
    if (idx === 0) {
      // Check the consistency of the certificate with the private key
      const pubKeyObject = crypto.createPrivateKey({ key: privateKey, format: 'pem' });
      const valid = acert.checkPrivateKey(pubKeyObject);
      console.log('CERT> Is consistent with private key', valid);
    }
  }
  console.log('CERT> =====================================');

  // Build an http server option structure
  const credentials = {
    // Keys
    key: privateKey,
    cert: certificates,
    // ca: ca,
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

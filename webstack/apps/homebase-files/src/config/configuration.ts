/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as hjson from 'hjson';
import * as fsModule from 'fs';
const fs = fsModule.promises;

// Get the version from the package file
import * as packageInfo from 'package.json';
const { version } = packageInfo;

// Import some definitions for the server
import { ServerConfiguration } from '@sage3/shared/types';

/**
 * Server configuration file that can be imported around the app.
 * loadConfig() is the first thing that runs at server start which sets this variable.
 */
let config: ServerConfiguration;

/**
 * loads the initial configuration file for production or development
 *
 * @returns object
 */
async function loadConfig(): Promise<ServerConfiguration> {
  // Test if development or production mode
  let production = false;
  if (process.env.NODE_ENV && process.env.NODE_ENV.indexOf('production') > -1) {
    production = true;
  }
  // HOT FIX, NX bug in 16.1
  // if (!process.env.NODE_ENV) production = true;
  console.log('Mode>', production ? 'Production' : 'Development');

  // Pick the correct filename
  let filename: string;
  if (production) {
    filename = 'sage3-prod.hjson';
  } else {
    filename = 'sage3-dev.hjson';
  }

  // Read the file and parse it into JSON (keeping comments)
  const txt = await fs.readFile(filename);
  const conf = hjson.parse(txt.toString(), { keepWsc: true });
  config = conf;
  // adding the version information
  config.version = version;

  console.log('Configuration> loaded from', filename);

  // Return the typed value
  return conf as ServerConfiguration;
}

export { loadConfig, config };

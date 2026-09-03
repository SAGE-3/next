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
import packageInfo from '../../../../package.json';
const { version } = packageInfo;

// Import some definitions for the server
import { ServerConfiguration, TASK_TYPES, LLMConfigManager, LLMTasks, LIVEKIT_DEV_SECRET, getScreenshareBackend } from '@sage3/shared/types';

/**
 * Server configuration file that can be imported around the app.
 * loadConfig() is the first thing that runs at server start which sets this variable.
 */
let config: ServerConfiguration;

/**
 * Resolves the LiveKit secret, which is the whole of the LiveKit configuration.
 *
 * Production takes it from LIVEKIT_API_SECRET (set in deployment/.env, which also hands
 * the same value to the LiveKit container). No secret means no screensharing: nothing is
 * mounted and the UI hides it. Development falls back to the loopback-only secret that
 * matches the local LiveKit container, so a developer configures nothing.
 *
 * @param conf - The configuration object to update in place
 * @param production - Whether the server is running in production mode
 */
function applyLiveKitConfiguration(conf: ServerConfiguration, production: boolean): void {
  const secret = process.env.LIVEKIT_API_SECRET || (production ? '' : LIVEKIT_DEV_SECRET);
  conf.services.livekit = secret ? { apiSecret: secret } : {};
}

/**
 * Validates the server configuration object
 *
 * @param conf - The configuration object to validate
 * @returns boolean indicating if configuration is valid
 */
function validateConfig(conf: ServerConfiguration, production: boolean): ServerConfiguration {
  const tasks = conf.services.models.tasks || ({} as LLMTasks);

  const default_provider = conf.services.models.settings.default_provider;
  const manager = new LLMConfigManager(conf.services.models);

  // Iterate over all possible tasks and create missing ones with default provider
  for (const taskType of TASK_TYPES) {
    if (!tasks[taskType]) {
      if (manager.canProviderPerformTask(default_provider, taskType)) {
        const candidateModels = manager.findModelForTask(default_provider, taskType);
        if (candidateModels.length > 0) {
          tasks[taskType] = {
            provider: conf.services.models.settings.default_provider,
            models: candidateModels.map((model) => model.model_id),
          };
        }
      }
    }
  }
  conf.services.models.tasks = tasks;

  console.log('Configuration> validated LLM tasks', conf.services.models.tasks);

  applyLiveKitConfiguration(conf, production);
  console.log('Configuration> screenshare backend:', getScreenshareBackend(conf.services));

  return conf;
}

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

  // Validate the configuration
  config = validateConfig(config, production);

  // Return the typed value
  return conf as ServerConfiguration;
}

export { loadConfig, config };

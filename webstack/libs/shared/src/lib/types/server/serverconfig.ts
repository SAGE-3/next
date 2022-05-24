/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { KeysInterface } from "./keys";


/**
 * Configuration parameters for the SAGE3 server
 *
 * @export
 * @interface serverConfiguration
 */
export interface serverConfiguration {
  // Production of development
  production: boolean;

  // version from the package.json file
  version: string;

  // Pretty name of the server to show in the UI
  serverName?: string;

  // HTTP settings
  port: number;
  tlsVersion: string;

  // Folders
  root: string;
  public: string;
  assets: string;
  // Server list
  servers: { name: string; url: string }[];
  // Services
  redis: {
    host: string;
  };
  fluent: {
    host: string;
  };
  // ID management API keys
  keys: KeysInterface;
}

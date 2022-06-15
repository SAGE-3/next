/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { httpGET } from './http';

// limited response from server to the configuration request, for security reasons
export type serverConfiguration = {
  serverName: string;
  port: number;
  production: boolean;
  servers: { name: string; url: string }[];
  version: string;
  token: string;
};

/**
 * Returns the fancy name of the host hosting SAGE3
 *
 * @export
 * @returns {string}
 */
export async function GetServerName(): Promise<string | null> {
  const value = await httpGET('/api/configuration');
  const config = value.data as serverConfiguration;
  return config.serverName || null;
}

export async function GetPort(): Promise<number | null> {
  const value = await httpGET('/api/configuration');
  const config = value.data as serverConfiguration;
  return config.port || null;
}

/**
 * Returns the whole data structure (albeit limited)
 * @returns serverConfiguration
 */
export async function GetConfiguration(): Promise<serverConfiguration> {
  const value = await httpGET('/api/configuration');
  const config = value.data as serverConfiguration;
  return config;
}

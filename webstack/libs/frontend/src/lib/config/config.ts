/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Public and limited response from server to the configuration request, for security reasons
export type serverConfiguration = {
  serverName: string;
  port: number;
  production: boolean;
  servers: { name: string; url: string }[];
  version: string;
  // Jupyter token
  token: string;
  // Namespace for signing uuid v5 keys
  namespace: string;
  // Admin names
  admins: string[];
  // Login strategies
  logins: string[];
};

/**
 * Returns the fancy name of the host hosting SAGE3
 *
 * @export
 * @returns {string}
 */
export async function GetServerName(): Promise<string | null> {
  const response = await fetch('/api/configuration', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const config = (await response.json()) as serverConfiguration;
  return config.serverName || null;
}

export async function GetPort(): Promise<number | null> {
  const response = await fetch('/api/configuration', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const config = (await response.json()) as serverConfiguration;
  return config.port || null;
}

/**
 * Returns the whole data structure (albeit limited)
 * @returns serverConfiguration
 */
export async function GetConfiguration(): Promise<serverConfiguration> {
  const response = await fetch('/api/configuration', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const config = (await response.json()) as serverConfiguration;
  return config;
}

/**
 * Returns the info public data structure
 * @returns Partial<serverConfiguration>
 */
export async function GetServerInfo(): Promise<Partial<serverConfiguration>> {
  const response = await fetch('/api/info', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const config = (await response.json()) as Partial<serverConfiguration>;
  return config;
}

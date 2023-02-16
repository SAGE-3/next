/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { PublicInfo, PublicServerConfiguration } from '@sage3/shared/types';

/**
 * Returns the whole data structure (albeit limited)
 * @returns serverConfiguration
 */
export async function GetConfiguration(): Promise<PublicServerConfiguration> {
  const response = await fetch('/api/configuration', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const config = (await response.json()) as PublicServerConfiguration;
  return config;
}

/**
 * Returns the info public data structure
 * @returns Partial<serverConfiguration>
 */
export async function GetServerInfo(): Promise<PublicInfo> {
  const response = await fetch('/api/info', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const config = (await response.json()) as PublicInfo;
  return config;
}

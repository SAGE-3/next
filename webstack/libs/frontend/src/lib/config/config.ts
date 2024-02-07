/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { PublicInformation, OpenConfiguration } from '@sage3/shared/types';
import { apiUrls } from './urls';

/**
 * Returns the whole data structure (albeit limited)
 * @returns {OpenConfiguration}
 */
export async function GetConfiguration(): Promise<OpenConfiguration> {
  const response = await fetch(apiUrls.config.getConfig, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const config = (await response.json()) as OpenConfiguration;
  return config;
}

/**
 * Returns the info public data structure
 * @returns {PublicInformation}
 */
export async function GetServerInfo(): Promise<PublicInformation> {
  const response = await fetch(apiUrls.misc.getInfo, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const config = (await response.json()) as PublicInformation;
  return config;
}

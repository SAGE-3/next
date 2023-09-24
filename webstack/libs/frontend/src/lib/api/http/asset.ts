/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Asset API Service
 * @file User Service
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { Asset } from '@sage3/shared/types';
import { APIHttp } from './api-http';

async function readAll(): Promise<Asset[] | undefined> {
  const response = await APIHttp.GET<Asset>('/assets');
  return response.data;
}

async function del(id: Asset['_id']): Promise<boolean> {
  const response = await APIHttp.DELETE('/assets/' + id);
  return response.success;
}

/**
 * Asset HTTP Service.
 * Provides POST, GET, DELETE requests to the backend.
 */
export const AssetHTTPService = {
  readAll,
  del,
};

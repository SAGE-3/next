/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Asset API Service
 * @file User Service
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { SBDocument } from '@sage3/sagebase';
import { AssetType } from '@sage3/shared/types';
import { APIHttp } from './api-http';

// async function read(id: AssetType['id']): Promise<AssetType[] | undefined> {
//   const response = await httpGET('/api/assets/' + id);
//   return response.data;
// }

async function readAll(): Promise<SBDocument<AssetType>[] | undefined> {
  const response = await APIHttp.GET<AssetType>('/api/assets');
  return response.data;

}

// async function del(id: AssetType['id']): Promise<boolean> {
//   const response = await httpDELETE('/api/assets/' + id);
//   return response.success;
// }

/**
 * Asset HTTP Service.
 * Provides POST, GET, DELETE requests to the backend.
 */
export const AssetHTTPService = {
  // read,
  readAll,
  // del,
};

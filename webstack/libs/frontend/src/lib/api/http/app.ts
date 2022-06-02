/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * App HTTP Service
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */


// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { AppSchema, AppStates } from '@sage3/applications/types';

import { httpDELETE, httpGET, httpPOST, httpPUT } from './http';

// CRUD operations
async function create(
  name: AppSchema['name'],
  description: AppSchema['description'],
  roomId: AppSchema['roomId'],
  boardId: AppSchema['boardId'],
  type: AppSchema['type'],
  state: AppSchema['state']
): Promise<AppSchema[] | undefined> {
  const body = { name, description, roomId, boardId, type, state };
  const res = await httpPOST('/api/apps', body);
  return res.data;
}

async function read(id: AppSchema['id']): Promise<AppSchema[] | undefined> {
  const response = await httpGET('/api/apps/' + id);
  return response.data;
}

async function readAll(): Promise<AppSchema[] | undefined> {
  const response = await httpGET('/api/apps');
  return response.data;
}

async function update(id: AppSchema['id'], update: Partial<AppSchema>): Promise<boolean> {
  const response = await httpPUT('/api/apps/' + id, update);
  return response.success;
}

async function del(id: AppSchema['id']): Promise<boolean> {
  const response = await httpDELETE('/api/apps/' + id);
  return response.success;
}

// Custom operations
async function query(query: Partial<AppSchema>): Promise<AppSchema[] | undefined> {
  let params = '';
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      params += `/${key}/${value}`;
    }
  }
  const response = await httpGET('/api/apps' + params);
  return response.data;
}

async function updateState(id: AppSchema['id'], state: Partial<AppStates>): Promise<boolean> {
  const response = await httpPUT('/api/apps/state/' + id, state);
  return response.success;
}

export const AppHTTPService = {
  create,
  read,
  readAll,
  query,
  update,
  updateState,
  del,
};

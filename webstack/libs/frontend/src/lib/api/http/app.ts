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
import { AppSchema } from '@sage3/applications/schema';

// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { AppStates } from '@sage3/applications/types';

import { httpDELETE, httpGET, httpPOST, httpPUT } from './http';

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
  return res.apps;
}

async function read(id: AppSchema['id']): Promise<AppSchema[] | undefined> {
  const params = { id };
  const response = await httpGET('/api/apps', params);
  return response.apps;
}

async function readAll(): Promise<AppSchema[] | undefined> {
  const response = await httpGET('/api/apps');
  return response.apps;
}

async function query(query: Partial<AppSchema>): Promise<AppSchema[] | undefined> {
  const params = { ...query };
  const response = await httpGET('/api/apps', params);
  return response.apps;
}

async function update(id: AppSchema['id'], update: Partial<AppSchema>): Promise<boolean> {
  const params = { id } as Partial<AppSchema>;
  const response = await httpPUT('/api/apps', params, update);
  return response.success;
}

async function updateState(id: AppSchema['id'], state: Partial<AppStates>): Promise<boolean> {
  const body = { id } as Partial<AppSchema>;
  const response = await httpPUT('/api/apps/state', state, body);
  return response.success;
}

async function del(id: AppSchema['id']): Promise<boolean> {
  const params = { id };
  const response = await httpDELETE('/api/apps', params);
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

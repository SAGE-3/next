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

import { AppSchema, AppStates } from '@sage3/shared/types';

import { httpDELETE, httpGET, httpPOST, httpPUT } from './http';

async function create(name: AppSchema['name'], description: AppSchema['description'], roomId: AppSchema['roomId'], boardId: AppSchema['boardId'], type: string, state: AppStates): Promise<AppSchema[] | undefined> {
  const body = { name, description, roomId, boardId, type, state };
  const res = await httpPOST('/api/app', body);
  return res.apps;
}

async function read(id: AppSchema['id']): Promise<AppSchema[] | undefined> {
  const params = { id };
  const response = await httpGET('/api/app', params);
  return response.apps;
}

async function readAll(): Promise<AppSchema[] | undefined> {
  const response = await httpGET('/api/app');
  return response.apps;
}

async function query(query: Partial<AppSchema>): Promise<AppSchema[] | undefined> {
  const params = { ...query };
  const response = await httpGET('/api/app', params);
  return response.apps;
}

async function update(id: AppSchema['id'], update: Partial<AppSchema>): Promise<boolean> {
  const reqParms = { id } as Partial<AppSchema>;
  const response = await httpPUT('/api/app', reqParms, update);
  return response.success;
}

async function updateState(id: AppSchema['id'], state: Partial<AppStates>): Promise<boolean> {
  const reqBody = { id } as Partial<AppSchema>;
  const response = await httpPUT('/api/app/state', state, reqBody);
  return response.success;
}

async function deleteApp(id: AppSchema['id']): Promise<boolean> {
  const params = { id };
  const response = await httpDELETE('/api/app', params);
  return response.success;
}

export const AppHTTPService = {
  create,
  read,
  readAll,
  query,
  update,
  updateState,
  deleteApp
};

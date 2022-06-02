/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Room API Service
 * @file User Service
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { RoomSchema } from '@sage3/shared/types';
import { httpDELETE, httpGET, httpPOST, httpPUT } from './http';

// CRUD operations
async function create(name: RoomSchema['name'], description: RoomSchema['description']): Promise<RoomSchema[] | undefined> {
  const body = { name, description };
  const res = await httpPOST('/api/rooms', body);
  return res.data;
}

async function read(id: RoomSchema['id']): Promise<RoomSchema[] | undefined> {
  const response = await httpGET('/api/rooms/' + id);
  return response.data;
}

async function readAll(): Promise<RoomSchema[] | undefined> {
  const response = await httpGET('/api/rooms');
  return response.data;
}

async function update(id: RoomSchema['id'], update: Partial<RoomSchema>): Promise<boolean> {
  const response = await httpPUT('/api/rooms/' + id, update);
  return response.success;
}

async function del(id: RoomSchema['id']): Promise<boolean> {
  const response = await httpDELETE('/api/rooms/' + id);
  return response.success;
}

// Custom operations
async function query(query: Partial<RoomSchema>): Promise<RoomSchema[] | undefined> {
  let params = '';
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      params += `/${key}/${value}`;
    }
  }
  const response = await httpGET('/api/rooms' + params);
  return response.data;
}

/**
 * Room HTTP Service.
 * Provides POST, GET, DELETE requests to the backend.
 */
export const RoomHTTPService = {
  create,
  read,
  readAll,
  query,
  update,
  del,
};

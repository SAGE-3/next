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

async function create(name: RoomSchema['name'], description: RoomSchema['description']): Promise<RoomSchema[] | undefined> {
  const body = { name, description };
  const res = await httpPOST('/api/room', body);
  return res.rooms;
}

async function read(id: RoomSchema['id']): Promise<RoomSchema[] | undefined> {
  const params = { id };
  const response = await httpGET('/api/room', params);
  return response.rooms;
}

async function readAll(): Promise<RoomSchema[] | undefined> {
  const response = await httpGET('/api/room');
  return response.rooms;
}

async function query(query: Partial<RoomSchema>): Promise<RoomSchema[] | undefined> {
  const params = { ...query };
  const response = await httpGET('/api/room', params);
  return response.rooms;
}

async function update(id: RoomSchema['id'], update: Partial<RoomSchema>): Promise<boolean> {
  const params = { id } as Partial<RoomSchema>;
  const response = await httpPUT('/api/room', params, update);
  return response.success;
}

async function del(id: RoomSchema['id']): Promise<boolean> {
  const params = { id };
  const response = await httpDELETE('/api/room', params);
  return response.success;
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
  del
};

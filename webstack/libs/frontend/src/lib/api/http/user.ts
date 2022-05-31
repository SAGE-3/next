/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * User HTTP Service
 * @file User Service
 * @author <a href="mailto:rtheriot@hawaii.edu">Ryan Theriot</a>
 * @version 1.0.0
 */

import { UserSchema } from '@sage3/shared/types';
import { httpDELETE, httpGET, httpPOST, httpPUT } from './http';

async function create(name: UserSchema['name'], email: UserSchema['email']): Promise<UserSchema[] | undefined> {
  const body = { name, email };
  const res = await httpPOST('/api/users', body);
  return res.users;
}

async function read(id: UserSchema['id']): Promise<UserSchema[] | undefined> {
  const params = { id };
  const response = await httpGET('/api/users', params);
  return response.users;
}

async function readCurrent(): Promise<UserSchema[] | undefined> {
  const response = await httpGET('/api/user/current');
  return response.users;
}

async function readAll(): Promise<UserSchema[] | undefined> {
  const response = await httpGET('/api/users');
  return response.users;
}

async function query(query: Partial<UserSchema>): Promise<UserSchema[] | undefined> {
  const params = { ...query };
  const response = await httpGET('/api/users', params);
  return response.users;
}

async function update(id: UserSchema['id'], updates: Partial<UserSchema>): Promise<boolean> {
  const response = await httpPUT('/api/users', { id }, updates);
  return response.success;
}

async function del(id: UserSchema['id']): Promise<boolean> {
  const params = { id };
  const response = await httpDELETE('/api/users', params);
  return response.success;
}

/**
 * User HTTP Service.
 * Provides POST, GET, DELETE requests to the backend.
 */
export const UserHTTPService = {
  create,
  read,
  readCurrent,
  readAll,
  query,
  update,
  del,
};
